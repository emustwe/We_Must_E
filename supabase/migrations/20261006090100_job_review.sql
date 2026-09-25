-- =============================================================================
-- Job review, part 2; sponsors see approved candidates; live map updates
-- =============================================================================
-- 1. A sponsor's new job is "pending" until an admin approves it. Editing a
--    live (or rejected) job sends it back for review.
-- 2. Sponsors see only admin-approved applications for their own jobs,
--    through functions that return exactly what they may see, and can watch
--    those videos (every view is logged).
-- 3. When the public map changes, the database broadcasts "jobs changed" so
--    open maps refresh within a second.
-- =============================================================================

-- 1. Job review ------------------------------------------------------------------
alter table public.jobs
  alter column status set default 'pending',
  alter column published_at drop not null,
  alter column published_at drop default,
  add column reviewed_by uuid references public.profiles (id) on delete set null,
  add column reviewed_at timestamptz,
  -- Why a job was not approved; shown to the sponsor.
  add column review_note text check (char_length(review_note) <= 500);
create index jobs_reviewer_idx on public.jobs (reviewed_by);
create index jobs_pending_idx on public.jobs (created_at) where status = 'pending';

create or replace function private.jobs_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_step_lng double precision; v_admin boolean := private.is_mfa_admin();
begin
  -- ~300 m grid: 0.0027° of latitude, and the same distance in longitude.
  v_step_lng := 0.0027 / greatest(cos(radians(new.lat)), 0.2);
  new.public_lat := round((round(new.lat / 0.0027) * 0.0027)::numeric, 5);
  new.public_lng := round((round(new.lng / v_step_lng) * v_step_lng)::numeric, 5);

  if tg_op = 'INSERT' then
    new.test_id      := coalesce(new.test_id, (select id from public.tests where is_active));
    new.video_set_id := coalesce(new.video_set_id, (select id from public.video_question_sets where is_active));
    new.survey_id    := coalesce(new.survey_id, (select id from public.surveys where is_active));
    -- Sponsors' jobs always start in review.
    if (select auth.uid()) is not null and not v_admin then
      new.status := 'pending';
    end if;
    new.published_at := case when new.status = 'published' then now() end;
    return new;
  end if;

  if (select auth.uid()) is not null and not v_admin then
    -- Sponsors: only close a live job; never publish, hide, remove or
    -- change question sets.
    if new.status is distinct from old.status
       and not (old.status = 'published' and new.status = 'closed') then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    if new.test_id is distinct from old.test_id or new.survey_id is distinct from old.survey_id
       or new.video_set_id is distinct from old.video_set_id
       or new.employer_id is distinct from old.employer_id then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    -- Changing what the public sees sends a live or rejected job back to review.
    if old.status in ('published', 'rejected') and new.status = old.status
       and (new.title, new.description, new.location_label, new.lat, new.lng,
            new.country_code, new.city)
           is distinct from
           (old.title, old.description, old.location_label, old.lat, old.lng,
            old.country_code, old.city) then
      new.status := 'pending';
      new.review_note := null;
    end if;
  end if;

  if new.status = 'published' and old.status <> 'published' then
    new.published_at := now();
    new.closed_at := null;
  end if;
  if new.status = 'closed' and old.status <> 'closed' then new.closed_at := now(); end if;
  return new;
end;
$$;

-- Sponsors post (always pending) and edit their own jobs while they are
-- pending, live, closed or rejected.
drop policy "jobs: employer posts" on public.jobs;
create policy "jobs: employer posts" on public.jobs
  for insert to authenticated with check (
    employer_id = (select auth.uid()) and private.is_approved_employer() and status = 'pending');
drop policy "jobs: employer edits own" on public.jobs;
create policy "jobs: employer edits own" on public.jobs
  for update to authenticated
  using (employer_id = (select auth.uid()) and private.is_approved_employer()
         and status in ('pending', 'published', 'closed', 'rejected'))
  with check (employer_id = (select auth.uid())
              and status in ('pending', 'published', 'closed', 'rejected'));

-- Approve (goes live now) or reject with a reason the sponsor sees.
create function public.admin_review_job(p_job_id uuid, p_approve boolean, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_old public.job_status;
begin
  perform private.require_mfa_admin();
  if char_length(p_note) > 500 then raise exception 'invalid_input' using errcode = '22023'; end if;
  select status into v_old from public.jobs where id = p_job_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  update public.jobs set
    status = case when p_approve then 'published'::public.job_status else 'rejected'::public.job_status end,
    review_note = case when p_approve then null else nullif(trim(p_note), '') end,
    reviewed_by = (select auth.uid()), reviewed_at = now()
  where id = p_job_id;
  perform private.log_audit(case when p_approve then 'job.approved' else 'job.rejected' end,
                            'job', p_job_id, jsonb_build_object('from', v_old));
end;
$$;
revoke all on function public.admin_review_job(uuid, boolean, text) from public, anon;
grant execute on function public.admin_review_job(uuid, boolean, text) to authenticated;

-- 2. Sponsors see approved candidates for their own jobs ---------------------------
create function private.employer_can_see_application(p_application_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_approved_employer() and exists (
    select 1 from public.applications a
      join public.jobs j on j.id = a.job_id
     where a.id = p_application_id and a.status = 'approved'
       and j.employer_id = (select auth.uid()));
$$;

-- Approved candidates for one of the sponsor's jobs, 20 per page (no export).
create function public.sponsor_list_candidates(p_job_id uuid, p_page integer default 0)
returns table (application_id uuid, full_name text, test_percent numeric, reviewed_at timestamptz,
               total bigint)
language sql stable security definer set search_path = '' as $$
  select a.id, p.full_name, a.test_percent, a.reviewed_at, count(*) over ()
    from public.applications a
    join public.jobs j on j.id = a.job_id
    join public.applicants p on p.id = a.applicant_id
   where a.job_id = p_job_id and a.status = 'approved'
     and j.employer_id = (select auth.uid()) and private.is_approved_employer()
   order by a.reviewed_at desc
   limit 20 offset greatest(p_page, 0) * 20;
$$;

-- One approved candidate: contact details, score, survey answers and the
-- list of videos. Admin notes, test answers and IP data are never included.
create function public.sponsor_get_candidate(p_application_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  if not private.employer_can_see_application(p_application_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  select jsonb_build_object(
    'id', a.id, 'job_id', a.job_id, 'job_title', j.title,
    'full_name', p.full_name, 'phone', p.phone_e164, 'email', p.email,
    'test_percent', a.test_percent, 'submitted_at', a.submitted_at, 'approved_at', a.reviewed_at,
    'survey', coalesce((
      select jsonb_agg(jsonb_build_object('prompt', q.prompt, 'type', q.type, 'options', q.options,
                                          'answer', s.answer) order by q.position)
        from public.survey_questions q
        join public.application_survey_answers s on s.question_id = q.id and s.application_id = a.id), '[]'),
    'videos', coalesce((
      select jsonb_agg(jsonb_build_object('question_id', q.id, 'prompt', q.prompt,
                                          'seconds', v.duration_seconds) order by q.position)
        from public.application_videos v
        join public.video_questions q on q.id = v.question_id
       where v.application_id = a.id), '[]'))
    into v
    from public.applications a
    join public.jobs j on j.id = a.job_id
    join public.applicants p on p.id = a.applicant_id
   where a.id = p_application_id;
  return v;
end;
$$;

-- Admins and sponsors may watch a video they are allowed to see; every view is logged.
create or replace function public.log_video_view(p_application_id uuid, p_question_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not (private.is_mfa_admin() or private.employer_can_see_application(p_application_id)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from public.application_videos
                  where application_id = p_application_id and question_id = p_question_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  perform private.log_audit('application.video_viewed', 'application', p_application_id,
                            jsonb_build_object('question', p_question_id));
end;
$$;

-- Storage paths start with the application id; anything else is not a uuid.
create function private.try_uuid(p_text text)
returns uuid language plpgsql immutable set search_path = '' as $$
begin
  return p_text::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

create policy "application_videos: sponsor reads approved" on public.application_videos
  for select to authenticated using (private.employer_can_see_application(application_id));
create policy "application-videos: sponsor reads approved" on storage.objects
  for select to authenticated using (
    bucket_id = 'application-videos'
    and private.employer_can_see_application(private.try_uuid((storage.foldername(name))[1])));

revoke all on function
  private.try_uuid(text),
  private.employer_can_see_application(uuid),
  public.sponsor_list_candidates(uuid, integer),
  public.sponsor_get_candidate(uuid)
  from public, anon;
grant execute on function public.sponsor_list_candidates(uuid, integer), public.sponsor_get_candidate(uuid)
  to authenticated;

-- 3. Live map: tell open maps when the public job list changes ---------------------
-- A public broadcast with no data in it; the map then reloads the public list.
create function private.broadcast_public_jobs()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' or new.status = 'published' or old.status = 'published' then
    begin
      perform realtime.send('{}'::jsonb, 'changed', 'public-jobs', false);
    exception when others then
      null; -- Never block a write because the live update could not be sent.
    end;
  end if;
  return null;
end;
$$;
create trigger jobs_broadcast after insert or update or delete on public.jobs
  for each row execute function private.broadcast_public_jobs();

-- Suspending or reactivating a sponsor also changes the map.
create function private.broadcast_sponsor_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    begin
      perform realtime.send('{}'::jsonb, 'changed', 'public-jobs', false);
    exception when others then
      null;
    end;
  end if;
  return null;
end;
$$;
create trigger employer_status_broadcast after update of status on public.employer_profiles
  for each row execute function private.broadcast_sponsor_status();

revoke all on function private.broadcast_public_jobs(), private.broadcast_sponsor_status() from public;

-- The storage and table policies above call these as the signed-in user.
grant execute on function private.try_uuid(text), private.employer_can_see_application(uuid) to authenticated;
