-- =============================================================================
-- Interview in 3 pages, one video, no scoring; sponsors unlock candidates
-- with E-coins
-- =============================================================================
-- 1. The video page shows the test questions again (or, without a test, the
--    video question set) and the applicant answers them in ONE video, up to
--    5 minutes.
-- 2. Answers are not scored: there is no right or wrong answer.
-- 3. When an application is approved, its sponsor sees the applicant's name;
--    the rest opens with 1 E-coin and stays open. Coins are added by admins
--    for now (a wallet comes later). Every coin movement is in a ledger.
-- =============================================================================

-- 1. One video per application ---------------------------------------------------
-- Older applications may have one video per question; they are kept as they are.
alter table public.application_videos drop constraint application_videos_pkey;
alter table public.application_videos add column id uuid not null default gen_random_uuid() primary key;
alter table public.application_videos alter column question_id drop not null;
create index application_videos_application_idx on public.application_videos (application_id);

-- The questions the video answers: the test's, or else the video set's.
create function private.video_prompts(p_application_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select jsonb_agg(q.prompt order by q.position)
       from public.applications a join public.test_questions q on q.test_id = a.test_id
      where a.id = p_application_id),
    (select jsonb_agg(v.prompt order by v.position)
       from public.applications a join public.video_questions v on v.set_id = a.video_set_id and v.is_active
      where a.id = p_application_id),
    '[]'::jsonb);
$$;

-- There is a video page whenever there are test (or video) questions.
create or replace function private.app_next_step(p_app public.applications, p_from public.application_step)
returns public.application_step language plpgsql stable security definer set search_path = '' as $$
begin
  if p_from = 'test' and exists (select 1 from public.test_questions where test_id = p_app.test_id) then
    return 'test';
  end if;
  if p_from in ('test', 'video') and (
       exists (select 1 from public.test_questions where test_id = p_app.test_id)
       or exists (select 1 from public.video_questions where set_id = p_app.video_set_id and is_active)) then
    return 'video';
  end if;
  return 'survey';
end;
$$;

-- Records THE video (replacing an earlier one). Returns the replaced paths so
-- the server can delete those files.
drop function public.app_record_video(uuid, text, uuid, text, integer, integer, text);
create function public.app_record_video(
  p_job_id uuid, p_token_hash text, p_storage_path text,
  p_duration_seconds integer, p_size_bytes integer, p_mime_type text)
returns text[] language plpgsql security definer set search_path = '' as $$
declare v public.applications; v_old text[];
begin
  v := private.app_for_token(p_job_id, p_token_hash);
  if v.current_step <> 'video' then raise exception 'wrong_step' using errcode = '22023'; end if;
  if p_storage_path not like v.id || '/answer/%' or p_duration_seconds > 305 then
    raise exception 'invalid_video' using errcode = '22023';
  end if;
  with removed as (
    delete from public.application_videos where application_id = v.id returning storage_path)
  select coalesce(array_agg(storage_path), '{}') into v_old from removed;
  insert into public.application_videos (application_id, storage_path, duration_seconds, size_bytes, mime_type)
  values (v.id, p_storage_path, greatest(p_duration_seconds, 1), p_size_bytes, p_mime_type);
  return v_old;
end;
$$;

create or replace function public.app_finish_videos(p_job_id uuid, p_token_hash text)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.applications;
begin
  v := private.app_for_token(p_job_id, p_token_hash);
  if v.current_step <> 'video' then raise exception 'wrong_step' using errcode = '22023'; end if;
  if not exists (select 1 from public.application_videos where application_id = v.id) then
    raise exception 'incomplete' using errcode = '22023';
  end if;
  update public.applications set current_step = 'survey' where id = v.id;
end;
$$;

-- 2. No scoring --------------------------------------------------------------------
create or replace function public.app_submit_test(p_job_id uuid, p_token_hash text)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.applications;
begin
  v := private.app_for_token(p_job_id, p_token_hash);
  if v.current_step <> 'test' or v.test_started_at is null then
    raise exception 'wrong_step' using errcode = '22023';
  end if;
  update public.applications set
    test_submitted_at = now(), test_score = null, test_max_score = null,
    current_step = private.app_next_step(v, 'video')
  where id = v.id;
end;
$$;

-- A test can go live as soon as it has questions (no answer keys any more).
create or replace function public.admin_activate_test(p_test_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_mfa_admin();
  if not exists (select 1 from public.tests where id = p_test_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.test_questions where test_id = p_test_id) then
    raise exception 'incomplete' using errcode = '22023';
  end if;
  update public.tests set is_active = false where is_active and id <> p_test_id;
  update public.tests set is_active = true where id = p_test_id;
  perform private.log_audit('test.activated', 'test', p_test_id);
end;
$$;

-- 3. E-coins -----------------------------------------------------------------------
alter table public.employer_profiles
  add column ecoin_balance integer not null default 0 check (ecoin_balance >= 0);

-- Every coin movement (added by an admin, spent on an unlock). Append-only.
create table public.ecoin_ledger (
  id             uuid primary key default gen_random_uuid(),
  employer_id    uuid not null references public.employer_profiles (user_id) on delete cascade,
  delta          integer not null check (delta <> 0),
  reason         text not null check (reason in ('admin_grant', 'unlock')),
  application_id uuid references public.applications (id) on delete set null,
  note           text check (char_length(note) <= 200),
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now()
);
create index ecoin_ledger_employer_idx on public.ecoin_ledger (employer_id, created_at desc);
create index ecoin_ledger_application_idx on public.ecoin_ledger (application_id);
create index ecoin_ledger_creator_idx on public.ecoin_ledger (created_by);

-- Candidates a sponsor has opened (they stay open).
create table public.candidate_unlocks (
  application_id uuid primary key references public.applications (id) on delete cascade,
  employer_id    uuid not null references public.employer_profiles (user_id) on delete cascade,
  unlocked_at    timestamptz not null default now()
);
create index candidate_unlocks_employer_idx on public.candidate_unlocks (employer_id);

alter table public.ecoin_ledger enable row level security;
alter table public.ecoin_ledger force row level security;
alter table public.candidate_unlocks enable row level security;
alter table public.candidate_unlocks force row level security;
revoke all on public.ecoin_ledger, public.candidate_unlocks from anon, authenticated;
grant select on public.ecoin_ledger, public.candidate_unlocks to authenticated;
create policy "ecoin_ledger: sponsor reads own" on public.ecoin_ledger
  for select to authenticated using (employer_id = (select auth.uid()));
create policy "ecoin_ledger: admin reads" on public.ecoin_ledger
  for select to authenticated using (private.is_mfa_admin());
create policy "candidate_unlocks: sponsor reads own" on public.candidate_unlocks
  for select to authenticated using (employer_id = (select auth.uid()));
create policy "candidate_unlocks: admin reads" on public.candidate_unlocks
  for select to authenticated using (private.is_mfa_admin());
-- No append-only trigger needed: no client role can insert, update or delete.

-- An approved application for one of the signed-in sponsor's jobs.
create function private.employer_owns_approved(p_application_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_approved_employer() and exists (
    select 1 from public.applications a
      join public.jobs j on j.id = a.job_id
     where a.id = p_application_id and a.status = 'approved'
       and j.employer_id = (select auth.uid()));
$$;

-- Sponsors see an application's details (and videos) only once unlocked.
create or replace function private.employer_can_see_application(p_application_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.employer_owns_approved(p_application_id) and exists (
    select 1 from public.candidate_unlocks u
     where u.application_id = p_application_id and u.employer_id = (select auth.uid()));
$$;

-- Candidates for one job (name only until unlocked), 20 per page.
drop function public.sponsor_list_candidates(uuid, integer);
create function public.sponsor_list_candidates(p_job_id uuid, p_page integer default 0)
returns table (application_id uuid, full_name text, reviewed_at timestamptz, unlocked boolean, total bigint)
language sql stable security definer set search_path = '' as $$
  select a.id, p.full_name, a.reviewed_at,
         exists (select 1 from public.candidate_unlocks u where u.application_id = a.id),
         count(*) over ()
    from public.applications a
    join public.jobs j on j.id = a.job_id
    join public.applicants p on p.id = a.applicant_id
   where a.job_id = p_job_id and a.status = 'approved'
     and j.employer_id = (select auth.uid()) and private.is_approved_employer()
   order by a.reviewed_at desc
   limit 20 offset greatest(p_page, 0) * 20;
$$;

-- All of the sponsor's candidates, newest first (the notifications list).
create function public.sponsor_all_candidates(p_page integer default 0)
returns table (application_id uuid, job_id uuid, job_title text, full_name text,
               reviewed_at timestamptz, unlocked boolean, total bigint, locked_total bigint)
language sql stable security definer set search_path = '' as $$
  with c as (
    select a.id, a.job_id, j.title, p.full_name, a.reviewed_at,
           exists (select 1 from public.candidate_unlocks u where u.application_id = a.id) as unlocked
      from public.applications a
      join public.jobs j on j.id = a.job_id
      join public.applicants p on p.id = a.applicant_id
     where a.status = 'approved' and j.employer_id = (select auth.uid()) and private.is_approved_employer())
  select id, job_id, title, full_name, reviewed_at, unlocked,
         count(*) over (), count(*) filter (where not unlocked) over ()
    from c
   order by reviewed_at desc
   limit 20 offset greatest(p_page, 0) * 20;
$$;

-- What a sponsor sees before unlocking: name, job, when it was shared.
create function public.sponsor_candidate_summary(p_application_id uuid)
returns table (application_id uuid, job_id uuid, job_title text, full_name text,
               reviewed_at timestamptz, unlocked boolean)
language sql stable security definer set search_path = '' as $$
  select a.id, a.job_id, j.title, p.full_name, a.reviewed_at,
         exists (select 1 from public.candidate_unlocks u where u.application_id = a.id)
    from public.applications a
    join public.jobs j on j.id = a.job_id
    join public.applicants p on p.id = a.applicant_id
   where a.id = p_application_id and private.employer_owns_approved(a.id);
$$;

-- Spend 1 E-coin to open a candidate for good. Returns the new balance.
create function public.sponsor_unlock_candidate(p_application_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_balance integer; v_uid uuid := (select auth.uid());
begin
  if not private.employer_owns_approved(p_application_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  select ecoin_balance into v_balance from public.employer_profiles where user_id = v_uid for update;
  if exists (select 1 from public.candidate_unlocks where application_id = p_application_id) then
    return v_balance; -- already open: no charge
  end if;
  if v_balance < 1 then raise exception 'no_coins' using errcode = '22023'; end if;
  update public.employer_profiles set ecoin_balance = ecoin_balance - 1 where user_id = v_uid
  returning ecoin_balance into v_balance;
  insert into public.candidate_unlocks (application_id, employer_id) values (p_application_id, v_uid);
  insert into public.ecoin_ledger (employer_id, delta, reason, application_id, created_by)
  values (v_uid, -1, 'unlock', p_application_id, v_uid);
  perform private.log_audit('candidate.unlocked', 'application', p_application_id);
  return v_balance;
end;
$$;

-- Admins add (or take back) E-coins. Audited; the balance never goes below 0.
create function public.admin_add_ecoins(p_employer_id uuid, p_amount integer, p_note text)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_balance integer;
begin
  perform private.require_mfa_admin();
  if p_amount = 0 or p_amount not between -1000 and 1000 or char_length(p_note) > 200 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  update public.employer_profiles set ecoin_balance = ecoin_balance + p_amount
   where user_id = p_employer_id
  returning ecoin_balance into v_balance;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  insert into public.ecoin_ledger (employer_id, delta, reason, note, created_by)
  values (p_employer_id, p_amount, 'admin_grant', nullif(trim(p_note), ''), (select auth.uid()));
  perform private.log_audit('ecoins.added', 'employer', p_employer_id, jsonb_build_object('amount', p_amount));
  return v_balance;
exception when check_violation then
  raise exception 'invalid_input' using errcode = '22023';
end;
$$;

-- One unlocked candidate: contact, test answers, the video(s), survey answers.
-- Admin notes and IP data are never included.
create or replace function public.sponsor_get_candidate(p_application_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  if not private.employer_can_see_application(p_application_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  select jsonb_build_object(
    'id', a.id, 'job_id', a.job_id, 'job_title', j.title,
    'full_name', p.full_name, 'phone', p.phone_e164, 'email', p.email,
    'submitted_at', a.submitted_at, 'approved_at', a.reviewed_at,
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
    'video_questions', private.video_prompts(a.id),
    'videos', coalesce((
      select jsonb_agg(jsonb_build_object('id', v.id, 'seconds', v.duration_seconds) order by v.uploaded_at)
        from public.application_videos v where v.application_id = a.id), '[]'))
    into v
    from public.applications a
    join public.jobs j on j.id = a.job_id
    join public.applicants p on p.id = a.applicant_id
   where a.id = p_application_id;
  return v;
end;
$$;

-- Video views are logged per video.
drop function public.log_video_view(uuid, uuid);
create function public.log_video_view(p_video_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_application uuid;
begin
  select application_id into v_application from public.application_videos where id = p_video_id;
  if v_application is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  if not (private.is_mfa_admin() or private.employer_can_see_application(v_application)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform private.log_audit('application.video_viewed', 'application', v_application,
                            jsonb_build_object('video', p_video_id));
end;
$$;

revoke all on function
  private.video_prompts(uuid),
  private.employer_owns_approved(uuid),
  public.app_record_video(uuid, text, text, integer, integer, text),
  public.sponsor_list_candidates(uuid, integer),
  public.sponsor_all_candidates(integer),
  public.sponsor_candidate_summary(uuid),
  public.sponsor_unlock_candidate(uuid),
  public.admin_add_ecoins(uuid, integer, text),
  public.log_video_view(uuid)
  from public, anon;
revoke all on function public.app_record_video(uuid, text, text, integer, integer, text) from authenticated;
grant execute on function public.app_record_video(uuid, text, text, integer, integer, text) to service_role;
grant execute on function private.employer_owns_approved(uuid) to authenticated;
grant execute on function
  public.sponsor_list_candidates(uuid, integer),
  public.sponsor_all_candidates(integer),
  public.sponsor_candidate_summary(uuid),
  public.sponsor_unlock_candidate(uuid),
  public.admin_add_ecoins(uuid, integer, text),
  public.log_video_view(uuid)
  to authenticated;
