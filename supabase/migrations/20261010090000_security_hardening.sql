-- =============================================================================
-- Security hardening (full security review)
-- =============================================================================
-- 1. The public map pin no longer gives away the exact latitude.
-- 2. Each application keeps its own contact details, so one applicant can't
--    change the name or email shown on someone else's applications.
-- 3. Any change a sponsor makes to a live job sends it back to review.
-- 4. Sponsors can post at most 20 jobs a day, even through the API.
-- 5. Videos and CVs open only through the server, so every view is logged
--    and rate-limited. Audit-writing functions are rate-limited too.
-- 6. Only the server clears the first-login password flag; the server can end
--    all of a user's sessions (after an admin sets a new password).
-- 7. Live map updates use a private channel that clients can't send on.
-- 8. The E-coin ledger and unlocks are append-only, even for the server.
-- =============================================================================

-- 1 + 3 + 4. Jobs ------------------------------------------------------------------
create or replace function private.jobs_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_cell_lat double precision; v_step_lng double precision;
  v_admin boolean := private.is_mfa_admin();
  -- Columns only the database or an admin sets; everything else is content.
  v_system text[] := array['status', 'updated_at', 'created_at', 'published_at', 'closed_at',
                           'public_lat', 'public_lng', 'review_note', 'reviewed_by', 'reviewed_at'];
begin
  -- ~300 m grid: 0.0027° of latitude, and the same distance in longitude. The
  -- longitude step depends only on the grid cell, never on the exact point.
  v_cell_lat := round(new.lat / 0.0027) * 0.0027;
  v_step_lng := 0.0027 / greatest(cos(radians(v_cell_lat)), 0.2);
  new.public_lat := round(v_cell_lat::numeric, 5);
  new.public_lng := round((round(new.lng / v_step_lng) * v_step_lng)::numeric, 5);

  if tg_op = 'INSERT' then
    new.test_id      := coalesce(new.test_id, (select id from public.tests where is_active));
    new.video_set_id := coalesce(new.video_set_id, (select id from public.video_question_sets where is_active));
    new.survey_id    := coalesce(new.survey_id, (select id from public.surveys where is_active));
    if (select auth.uid()) is not null and not v_admin then
      -- Sponsors' jobs always start in review, and at most 20 a day.
      new.status := 'pending';
      if (select count(*) from public.jobs
           where employer_id = new.employer_id and created_at > now() - interval '1 day') >= 20 then
        raise exception 'rate_limited' using errcode = '54000';
      end if;
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
    -- Any content change (every column, including ones added later) sends a
    -- live or rejected job back to review.
    if old.status in ('published', 'rejected') and new.status = old.status
       and (to_jsonb(new) - v_system) is distinct from (to_jsonb(old) - v_system) then
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

-- Recompute every public pin with the new grid (runs without a user, so no
-- status changes).
update public.jobs set lat = lat;

-- 2. Contact details per application ---------------------------------------------
alter table public.applications
  add column contact_name text check (char_length(contact_name) <= 120),
  add column contact_email text check (char_length(contact_email) <= 254),
  add column contact_phone text check (contact_phone ~ '^\+[1-9][0-9]{7,14}$');
create index applications_contact_name_idx on public.applications (lower(contact_name));

update public.applications a set
  contact_name  = coalesce(nullif(trim(a.profile ->> 'fullName'), ''), p.full_name),
  contact_email = coalesce(nullif(lower(trim(a.profile ->> 'email')), ''), p.email),
  contact_phone = p.phone_e164
  from public.applicants p
 where p.id = a.applicant_id and a.contact_name is null;

create or replace function public.app_submit(
  p_job_id uuid, p_token_hash text, p_full_name text, p_phone_e164 text, p_email text,
  p_answers jsonb, p_consent_version text, p_ip_hash text, p_phone_verified boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v public.applications; v_applicant uuid; v_q record; v_a jsonb;
begin
  v := private.app_for_token(p_job_id, p_token_hash);
  if v.current_step <> 'survey' then raise exception 'wrong_step' using errcode = '22023'; end if;
  if not p_phone_verified then raise exception 'phone_unverified' using errcode = '22023'; end if;
  if jsonb_typeof(p_answers) is distinct from 'object'
     or exists (select 1 from jsonb_object_keys(p_answers) k
                 where not exists (select 1 from public.survey_questions q
                                    where q.survey_id = v.survey_id and q.id::text = k)) then
    raise exception 'invalid_answer' using errcode = '22023';
  end if;

  for v_q in select * from public.survey_questions where survey_id = v.survey_id loop
    v_a := p_answers -> v_q.id::text;
    if v_a is null then
      if v_q.required then raise exception 'incomplete' using errcode = '22023'; end if;
      continue;
    end if;
    if not coalesce(case v_q.type
      when 'single_choice' then jsonb_typeof(v_a -> 'options') = 'array' and jsonb_array_length(v_a -> 'options') = 1
      when 'multi_choice' then jsonb_typeof(v_a -> 'options') = 'array' and jsonb_array_length(v_a -> 'options') >= 1
      when 'number' then jsonb_typeof(v_a -> 'number') = 'number'
      when 'scale' then jsonb_typeof(v_a -> 'number') = 'number' and (v_a ->> 'number')::numeric between 1 and 5
      else jsonb_typeof(v_a -> 'text') = 'string' and char_length(v_a ->> 'text') between 1 and 3000
    end, false) or (v_q.type in ('single_choice', 'multi_choice') and exists (
      select 1 from jsonb_array_elements(v_a -> 'options') o
       where jsonb_typeof(o) <> 'number' or (o #>> '{}')::numeric <> floor((o #>> '{}')::numeric)
          or (o #>> '{}')::numeric < 0
          or (o #>> '{}')::numeric >= jsonb_array_length(v_q.options))) then
      raise exception 'invalid_answer' using errcode = '22023';
    end if;
    insert into public.application_survey_answers (application_id, question_id, answer)
    values (v.id, v_q.id, v_a)
    on conflict (application_id, question_id) do update set answer = excluded.answer;
  end loop;

  -- The phone number links a person's applications. An existing person's
  -- name and email are never changed from here (the phone isn't verified):
  -- what this applicant typed is kept on this application only.
  insert into public.applicants (phone_e164, email, full_name)
  values (p_phone_e164, nullif(lower(trim(p_email)), ''), trim(p_full_name))
  on conflict (phone_e164) do update set phone_e164 = public.applicants.phone_e164
  returning id into v_applicant;

  insert into public.consents (application_id, text_version, ip_hash)
  values (v.id, p_consent_version, left(p_ip_hash, 128));

  update public.applications set
    applicant_id = v_applicant, status = 'submitted', current_step = 'submitted',
    submitted_at = now(), draft_token_hash = null,
    contact_name = left(trim(p_full_name), 120),
    contact_email = left(nullif(lower(trim(p_email)), ''), 254),
    contact_phone = p_phone_e164
  where id = v.id;
  return v.id;
end;
$$;

-- Sponsors see the details given with the application they were shared.
create or replace function public.sponsor_list_candidates(p_job_id uuid, p_page integer default 0)
returns table (application_id uuid, full_name text, reviewed_at timestamptz, unlocked boolean, total bigint)
language sql stable security definer set search_path = '' as $$
  select a.id, a.contact_name, a.reviewed_at,
         exists (select 1 from public.candidate_unlocks u where u.application_id = a.id),
         count(*) over ()
    from public.applications a
    join public.jobs j on j.id = a.job_id
   where a.job_id = p_job_id and a.status = 'approved'
     and j.employer_id = (select auth.uid()) and private.is_approved_employer()
   order by a.reviewed_at desc
   limit 20 offset greatest(p_page, 0) * 20;
$$;

create or replace function public.sponsor_all_candidates(p_page integer default 0)
returns table (application_id uuid, job_id uuid, job_title text, full_name text,
               reviewed_at timestamptz, unlocked boolean, total bigint, locked_total bigint)
language sql stable security definer set search_path = '' as $$
  with c as (
    select a.id, a.job_id, j.title, a.contact_name, a.reviewed_at,
           exists (select 1 from public.candidate_unlocks u where u.application_id = a.id) as unlocked
      from public.applications a
      join public.jobs j on j.id = a.job_id
     where a.status = 'approved' and j.employer_id = (select auth.uid()) and private.is_approved_employer())
  select id, job_id, title, contact_name, reviewed_at, unlocked,
         count(*) over (), count(*) filter (where not unlocked) over ()
    from c
   order by reviewed_at desc
   limit 20 offset greatest(p_page, 0) * 20;
$$;

create or replace function public.sponsor_candidate_summary(p_application_id uuid)
returns table (application_id uuid, job_id uuid, job_title text, full_name text,
               reviewed_at timestamptz, unlocked boolean)
language sql stable security definer set search_path = '' as $$
  select a.id, a.job_id, j.title, a.contact_name, a.reviewed_at,
         exists (select 1 from public.candidate_unlocks u where u.application_id = a.id)
    from public.applications a
    join public.jobs j on j.id = a.job_id
   where a.id = p_application_id and private.employer_owns_approved(a.id);
$$;

-- The unlocked candidate: now without storage paths (files open through the server).
create or replace function public.sponsor_get_candidate(p_application_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  if not private.employer_can_see_application(p_application_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  select jsonb_build_object(
    'id', a.id, 'job_id', a.job_id, 'job_title', j.title,
    'full_name', a.contact_name, 'phone', a.contact_phone, 'email', a.contact_email,
    'submitted_at', a.submitted_at, 'approved_at', a.reviewed_at,
    'profile', coalesce(a.profile, '{}'::jsonb) - 'fullName' - 'phone' - 'email',
    'has_cv', a.cv_path is not null,
    'test', coalesce((
      select jsonb_agg(jsonb_build_object('prompt', q.prompt, 'type', q.type, 'options', q.options,
                                          'answer', t.answer) order by q.position)
        from public.test_questions q
        left join public.application_test_answers t on t.question_id = q.id and t.application_id = a.id
       where q.test_id = a.test_id), '[]'),
    'survey', coalesce((
      select jsonb_agg(jsonb_build_object('prompt', q.prompt, 'type', q.type, 'options', q.options,
                                          'answer', s.answer) order by q.position)
        from public.survey_questions q
        join public.application_survey_answers s on s.question_id = q.id and s.application_id = a.id), '[]'),
    'video_questions', case
      when exists (select 1 from public.application_videos v2 where v2.application_id = a.id and v2.question_id is not null)
      then '[]'::jsonb else private.video_prompts(a.id) end,
    'videos', coalesce((
      select jsonb_agg(jsonb_build_object('id', v.id, 'seconds', v.duration_seconds, 'prompt', vq.prompt)
                       order by vq.position nulls last, v.uploaded_at)
        from public.application_videos v
        left join public.video_questions vq on vq.id = v.question_id
       where v.application_id = a.id), '[]'))
    into v
    from public.applications a
    join public.jobs j on j.id = a.job_id
   where a.id = p_application_id;
  return v;
end;
$$;

-- 5. Videos and CVs only through the server ---------------------------------------
-- Sponsors no longer read the files or the video rows directly: the server
-- asks the functions below (which check access, rate-limit and log the view)
-- for the path, and only then makes a 5-minute link.
drop policy "application-videos: sponsor reads approved" on storage.objects;
drop policy "application-cvs: sponsor reads unlocked" on storage.objects;
drop policy "application_videos: sponsor reads approved" on public.application_videos;

-- Sponsors: at most 600 audited actions an hour (views, logo changes).
create function private.within_sponsor_limit(p_what text)
returns boolean language sql security definer set search_path = '' as $$
  select private.is_mfa_admin()
      or public.check_rate_limit('db:' || p_what || ':' || (select auth.uid())::text, 600, 3600);
$$;
revoke all on function private.within_sponsor_limit(text) from public, anon;
grant execute on function private.within_sponsor_limit(text) to authenticated;

drop function public.log_video_view(uuid);
create function public.log_video_view(p_video_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v_application uuid; v_path text;
begin
  select application_id, storage_path into v_application, v_path
    from public.application_videos where id = p_video_id;
  if v_application is null
     or not (private.is_mfa_admin() or private.employer_can_see_application(v_application)) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if not private.within_sponsor_limit('media') then
    raise exception 'rate_limited' using errcode = '54000';
  end if;
  perform private.log_audit('application.video_viewed', 'application', v_application,
                            jsonb_build_object('video', p_video_id));
  return v_path;
end;
$$;

drop function public.log_cv_view(uuid);
create function public.log_cv_view(p_application_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v_path text;
begin
  if not (private.is_mfa_admin() or private.employer_can_see_application(p_application_id)) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  select cv_path into v_path from public.applications where id = p_application_id;
  if v_path is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  if not private.within_sponsor_limit('media') then
    raise exception 'rate_limited' using errcode = '54000';
  end if;
  perform private.log_audit('application.cv_viewed', 'application', p_application_id);
  return v_path;
end;
$$;

revoke all on function public.log_video_view(uuid), public.log_cv_view(uuid) from public, anon;
grant execute on function public.log_video_view(uuid), public.log_cv_view(uuid) to authenticated;

-- 6. Passwords and sessions --------------------------------------------------------
revoke execute on function public.complete_password_change() from authenticated;

-- Ends every session of a user. Server only (after an admin sets a password).
create function public.admin_revoke_sessions(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from auth.refresh_tokens where user_id = p_user_id::text;
  delete from auth.sessions where user_id = p_user_id;
end;
$$;
revoke all on function public.admin_revoke_sessions(uuid) from public, anon, authenticated;
grant execute on function public.admin_revoke_sessions(uuid) to service_role;

-- 7. Live map: a private channel ----------------------------------------------------
-- Anyone may listen on "public-jobs"; nobody may send on it (only the
-- database does, below). Before, any visitor could make every open map reload.
create policy "public-jobs: anyone listens" on realtime.messages
  for select to anon, authenticated
  using (realtime.topic() = 'public-jobs' and extension = 'broadcast');

create or replace function private.broadcast_public_jobs()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' or new.status = 'published' or old.status = 'published' then
    begin
      perform realtime.send('{}'::jsonb, 'changed', 'public-jobs', true);
    exception when others then
      null; -- Never block a write because the live update could not be sent.
    end;
  end if;
  return null;
end;
$$;

create or replace function private.broadcast_sponsor_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    begin
      perform realtime.send('{}'::jsonb, 'changed', 'public-jobs', true);
    exception when others then
      null;
    end;
  end if;
  return null;
end;
$$;

-- 8. Append-only money records -----------------------------------------------------
-- Rows can't be changed. The only change allowed is a link being cleared
-- (the database does that when the linked application or person is deleted);
-- rows still go when a sponsor account is deleted.
create function private.block_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from jsonb_each(to_jsonb(new)) n
               join jsonb_each(to_jsonb(old)) o using (key)
              where n.value is distinct from o.value and n.value <> 'null'::jsonb) then
    raise exception 'append_only' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger ecoin_ledger_append_only before update on public.ecoin_ledger
  for each row execute function private.block_change();
create trigger candidate_unlocks_append_only before update on public.candidate_unlocks
  for each row execute function private.block_change();
revoke update, truncate on public.ecoin_ledger, public.candidate_unlocks from service_role;

-- Audit entries about sponsors: rate-limited like views.
create or replace function public.log_sponsor_change(p_employer_id uuid, p_change text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_change not in ('logo', 'password', 'deleted') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  -- Admins (MFA) may do all three; a sponsor only changes their own logo.
  if not (private.is_mfa_admin()
          or (p_change = 'logo' and p_employer_id = (select auth.uid()) and private.is_approved_employer())) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from public.employer_profiles where user_id = p_employer_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if not private.within_sponsor_limit('sponsor-change') then
    raise exception 'rate_limited' using errcode = '54000';
  end if;
  perform private.log_audit('sponsor.' || p_change, 'employer', p_employer_id);
end;
$$;
