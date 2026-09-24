-- =============================================================================
-- v2 phase 4: public applications (no accounts)
-- =============================================================================
-- A visitor applies to one job in 3 steps: test -> video -> survey + consent.
-- There is no client write access at all: every public write goes through the
-- server module src/server/public-application/, which uses the service role
-- and the app_* functions below. Each app_* function looks the application up
-- by (job, token hash), so a token only ever opens its own application.
-- Employers get read access to approved applications in phase 6.
-- =============================================================================

-- 1. Content: written test questions, points, multi-answer keys, optional timer
create type public.test_question_type as enum ('single_choice', 'multi_choice', 'short_text', 'long_text');

alter table public.tests alter column time_limit_seconds drop not null;

alter table public.test_questions
  add column type   public.test_question_type not null default 'single_choice',
  add column points smallint not null default 1 check (points between 0 and 100);
alter table public.test_questions drop constraint test_questions_options_check;
alter table public.test_questions add constraint test_questions_options_check check (
  jsonb_typeof(options) = 'array' and (
    (type in ('short_text', 'long_text') and jsonb_array_length(options) = 0) or
    (type in ('single_choice', 'multi_choice') and jsonb_array_length(options) between 2 and 8)));

-- Still RLS with no policies: only SECURITY DEFINER functions read the keys.
alter table public.test_answer_keys add column correct_options smallint[];
update public.test_answer_keys set correct_options = array[correct_option];
alter table public.test_answer_keys drop column correct_option;
alter table public.test_answer_keys alter column correct_options set not null;
alter table public.test_answer_keys add constraint test_answer_keys_options_check
  check (cardinality(correct_options) between 1 and 8 and 0 <= all (correct_options));

-- Video questions come in sets; one set is active and is used by new jobs.
create table public.video_question_sets (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (char_length(title) between 1 and 200),
  is_active  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index video_question_sets_single_active on public.video_question_sets (is_active) where is_active;
create trigger set_updated_at before update on public.video_question_sets
  for each row execute function private.set_updated_at();
alter table public.video_question_sets enable row level security;
alter table public.video_question_sets force row level security;
create policy "video_question_sets: admin reads" on public.video_question_sets
  for select to authenticated using (private.is_mfa_admin());
create policy "video_question_sets: admin writes" on public.video_question_sets
  for all to authenticated using (private.is_mfa_admin()) with check (private.is_mfa_admin());
revoke all on public.video_question_sets from anon;

alter table public.video_prompts rename to video_questions;
alter policy "video_prompts: admin reads" on public.video_questions rename to "video_questions: admin reads";
alter policy "video_prompts: admin writes" on public.video_questions rename to "video_questions: admin writes";
alter table public.video_questions add column set_id uuid references public.video_question_sets (id) on delete cascade;
create index video_questions_set_idx on public.video_questions (set_id, position);

-- Existing questions move into one default set, which becomes the active one.
do $$
declare v_set uuid;
begin
  if exists (select 1 from public.video_questions) then
    insert into public.video_question_sets (title, is_active) values ('Video questions', true) returning id into v_set;
    update public.video_questions set set_id = v_set;
  end if;
end $$;
alter table public.video_questions alter column set_id set not null;

-- New questions without a set join the active set (keeps the current admin page working).
create function private.video_questions_default_set()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.set_id is null then
    select id into new.set_id from public.video_question_sets where is_active;
    if new.set_id is null then
      insert into public.video_question_sets (title, is_active) values ('Video questions', true)
      returning id into new.set_id;
    end if;
  end if;
  return new;
end;
$$;
create trigger video_questions_default_set before insert on public.video_questions
  for each row execute function private.video_questions_default_set();

-- Answer-key admin functions now take a list of correct options.
drop function if exists public.admin_set_answer_key(uuid, smallint);
drop function if exists public.admin_get_answer_keys(uuid);

create function public.admin_set_answer_key(p_question_id uuid, p_correct_options smallint[])
returns void language plpgsql security definer set search_path = '' as $$
declare v_options integer; v_type public.test_question_type;
begin
  perform private.require_mfa_admin();
  select jsonb_array_length(options), type into v_options, v_type
    from public.test_questions where id = p_question_id;
  if v_options is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  if v_type not in ('single_choice', 'multi_choice')
     or cardinality(p_correct_options) < 1
     or (v_type = 'single_choice' and cardinality(p_correct_options) <> 1)
     or exists (select 1 from unnest(p_correct_options) o where o < 0 or o >= v_options) then
    raise exception 'invalid_option' using errcode = '22023';
  end if;
  insert into public.test_answer_keys (question_id, correct_options)
  values (p_question_id, (select array_agg(distinct o order by o) from unnest(p_correct_options) o))
  on conflict (question_id) do update set correct_options = excluded.correct_options;
  perform private.log_audit('test.answer_key_set', 'test_question', p_question_id);
end;
$$;

create function public.admin_get_answer_keys(p_test_id uuid)
returns table (question_id uuid, correct_options smallint[])
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_mfa_admin();
  return query
    select k.question_id, k.correct_options
      from public.test_answer_keys k
      join public.test_questions q on q.id = k.question_id
     where q.test_id = p_test_id;
end;
$$;

-- A test can go live once every choice question has an answer key.
create or replace function public.admin_activate_test(p_test_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_mfa_admin();
  if not exists (select 1 from public.tests where id = p_test_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.test_questions q
             left join public.test_answer_keys k on k.question_id = q.id
             where q.test_id = p_test_id and q.type in ('single_choice', 'multi_choice')
               and k.question_id is null)
     or not exists (select 1 from public.test_questions where test_id = p_test_id) then
    raise exception 'incomplete' using errcode = '22023';
  end if;
  update public.tests set is_active = false where is_active and id <> p_test_id;
  update public.tests set is_active = true where id = p_test_id;
  perform private.log_audit('test.activated', 'test', p_test_id);
end;
$$;

revoke all on function
  public.admin_set_answer_key(uuid, smallint[]),
  public.admin_get_answer_keys(uuid),
  private.video_questions_default_set()
  from public, anon;
grant execute on function public.admin_set_answer_key(uuid, smallint[]), public.admin_get_answer_keys(uuid)
  to authenticated;

-- 2. Jobs remember which video set applicants answer --------------------------
alter table public.jobs add column video_set_id uuid references public.video_question_sets (id) on delete set null;
create index jobs_test_idx on public.jobs (test_id);
create index jobs_survey_idx on public.jobs (survey_id);
create index jobs_video_set_idx on public.jobs (video_set_id);
update public.jobs set video_set_id = (select id from public.video_question_sets where is_active);

create or replace function private.jobs_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_step_lng double precision;
begin
  -- ~300 m grid: 0.0027° of latitude, and the same distance in longitude.
  v_step_lng := 0.0027 / greatest(cos(radians(new.lat)), 0.2);
  new.public_lat := round((round(new.lat / 0.0027) * 0.0027)::numeric, 5);
  new.public_lng := round((round(new.lng / v_step_lng) * v_step_lng)::numeric, 5);

  if tg_op = 'INSERT' then
    new.test_id      := coalesce(new.test_id, (select id from public.tests where is_active));
    new.video_set_id := coalesce(new.video_set_id, (select id from public.video_question_sets where is_active));
    new.survey_id    := coalesce(new.survey_id, (select id from public.surveys where is_active));
    new.published_at := now();
    return new;
  end if;

  -- Employers (any caller with a JWT who isn't an MFA admin) may only close a
  -- published job, never re-publish, hide, remove or change question sets.
  if (select auth.uid()) is not null and not private.is_mfa_admin() then
    if new.status is distinct from old.status
       and not (old.status = 'published' and new.status = 'closed') then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    if new.test_id is distinct from old.test_id or new.survey_id is distinct from old.survey_id
       or new.video_set_id is distinct from old.video_set_id
       or new.employer_id is distinct from old.employer_id then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  end if;

  if new.status = 'closed' and old.status <> 'closed' then new.closed_at := now(); end if;
  if new.status = 'published' and old.status <> 'published' then new.closed_at := null; end if;
  return new;
end;
$$;

-- 3. Applications -------------------------------------------------------------
create type public.application_step as enum ('test', 'video', 'survey', 'submitted');
create type public.application_status as enum ('in_progress', 'submitted', 'approved', 'rejected');

-- One row per person, matched by phone number, so admins see repeat applications.
create table public.applicants (
  id         uuid primary key default gen_random_uuid(),
  phone_e164 text not null unique check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  email      text check (email is null or (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  full_name  text not null check (char_length(full_name) between 2 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.applicants
  for each row execute function private.set_updated_at();

create table public.applications (
  id                uuid primary key default gen_random_uuid(),
  job_id            uuid not null references public.jobs (id) on delete cascade,
  applicant_id      uuid references public.applicants (id) on delete cascade,  -- set on submit
  -- The question sets used, fixed when the application starts.
  test_id           uuid references public.tests (id) on delete set null,
  video_set_id      uuid references public.video_question_sets (id) on delete set null,
  survey_id         uuid references public.surveys (id) on delete set null,
  -- HMAC of the random cookie token. Cleared on submit, so it can't be reused.
  draft_token_hash  text unique check (char_length(draft_token_hash) <= 128),
  draft_expires_at  timestamptz not null default now() + interval '24 hours',
  current_step      public.application_step not null default 'test',
  status            public.application_status not null default 'in_progress',
  test_score        numeric(7,2),
  test_max_score    numeric(7,2),
  test_started_at   timestamptz,
  test_submitted_at timestamptz,
  submitted_at      timestamptz,
  reviewed_by       uuid references public.profiles (id) on delete set null,
  reviewed_at       timestamptz,
  admin_notes       text check (char_length(admin_notes) <= 2000),
  ip_hash           text check (char_length(ip_hash) <= 128),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check ((status = 'in_progress') = (current_step <> 'submitted')),
  check (status = 'in_progress' or (applicant_id is not null and submitted_at is not null))
);
create index applications_job_status_idx on public.applications (job_id, status);
create index applications_inbox_idx on public.applications (status, submitted_at desc);
create index applications_applicant_idx on public.applications (applicant_id);
create index applications_cleanup_idx on public.applications (created_at) where status = 'in_progress';
create index applications_test_idx on public.applications (test_id);
create index applications_video_set_idx on public.applications (video_set_id);
create index applications_survey_idx on public.applications (survey_id);
create index applications_reviewer_idx on public.applications (reviewed_by);
create trigger set_updated_at before update on public.applications
  for each row execute function private.set_updated_at();

create table public.application_test_answers (
  application_id uuid not null references public.applications (id) on delete cascade,
  question_id    uuid not null references public.test_questions (id) on delete cascade,
  -- {"options":[1]} for choice questions, {"text":"..."} for written ones.
  answer         jsonb not null check (jsonb_typeof(answer) = 'object' and pg_column_size(answer) <= 8192),
  is_correct     boolean,
  points_awarded numeric(6,2),
  graded_by      uuid references public.profiles (id) on delete set null,
  answered_at    timestamptz not null default now(),
  primary key (application_id, question_id)
);
create index application_test_answers_question_idx on public.application_test_answers (question_id);
create index application_test_answers_grader_idx on public.application_test_answers (graded_by);

create table public.application_videos (
  application_id   uuid not null references public.applications (id) on delete cascade,
  question_id      uuid not null references public.video_questions (id) on delete cascade,
  storage_path     text not null unique check (char_length(storage_path) <= 300),
  duration_seconds integer not null check (duration_seconds between 1 and 310),
  size_bytes       integer not null check (size_bytes between 1 and 104857600),
  mime_type        text not null check (mime_type in ('video/webm', 'video/mp4')),
  uploaded_at      timestamptz not null default now(),
  primary key (application_id, question_id)
);
create index application_videos_question_idx on public.application_videos (question_id);

create table public.application_survey_answers (
  application_id uuid not null references public.applications (id) on delete cascade,
  question_id    uuid not null references public.survey_questions (id) on delete cascade,
  answer         jsonb not null check (jsonb_typeof(answer) = 'object' and pg_column_size(answer) <= 8192),
  primary key (application_id, question_id)
);
create index application_survey_answers_question_idx on public.application_survey_answers (question_id);

create table public.consents (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  text_version   text not null check (char_length(text_version) between 1 and 40),
  accepted_at    timestamptz not null default now(),
  ip_hash        text check (char_length(ip_hash) <= 128)
);
create index consents_application_idx on public.consents (application_id);

-- Only used when REQUIRE_PHONE_OTP is on.
create table public.phone_verifications (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  phone_e164     text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  code_hash      text not null check (char_length(code_hash) <= 128),
  attempts       smallint not null default 0,
  expires_at     timestamptz not null,
  verified_at    timestamptz,
  created_at     timestamptz not null default now()
);
create index phone_verifications_application_idx on public.phone_verifications (application_id, created_at desc);

-- RLS: nobody but MFA admins reads anything yet (employers come in phase 6).
-- No client role can insert, update or delete: public writes use the app_*
-- functions through the server's service-role module.
do $$
declare t text;
begin
  foreach t in array array['applicants', 'applications', 'application_test_answers', 'application_videos',
                           'application_survey_answers', 'consents', 'phone_verifications'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('create policy "%s: admin reads" on public.%I for select to authenticated using (private.is_mfa_admin())', t, t);
  end loop;
end $$;
-- Codes are never readable, not even by admins.
drop policy "phone_verifications: admin reads" on public.phone_verifications;
revoke select on public.phone_verifications from authenticated;

-- 4. Public application functions (service role only) --------------------------
-- The application for a job and token, or an error. Locks the row.
create function private.app_for_token(p_job_id uuid, p_token_hash text)
returns public.applications language plpgsql security definer set search_path = '' as $$
declare v public.applications;
begin
  select * into v from public.applications
   where job_id = p_job_id and draft_token_hash = p_token_hash
     and status = 'in_progress' and draft_expires_at > now()
   for update;
  if not found then raise exception 'invalid_token' using errcode = '28000'; end if;
  return v;
end;
$$;

-- First step with content, starting from p_from.
create function private.app_next_step(p_app public.applications, p_from public.application_step)
returns public.application_step language plpgsql stable security definer set search_path = '' as $$
begin
  if p_from = 'test' and exists (select 1 from public.test_questions where test_id = p_app.test_id) then
    return 'test';
  end if;
  if p_from in ('test', 'video')
     and exists (select 1 from public.video_questions where set_id = p_app.video_set_id and is_active) then
    return 'video';
  end if;
  return 'survey';
end;
$$;

-- Starts an application for a published job of an approved employer.
create function public.app_start(p_job_id uuid, p_token_hash text, p_ip_hash text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v public.applications; v_job public.jobs;
begin
  select j.* into v_job from public.jobs j
    join public.employer_profiles e on e.user_id = j.employer_id
   where j.id = p_job_id and j.status = 'published' and e.status = 'approved';
  if not found then raise exception 'job_unavailable' using errcode = 'P0002'; end if;
  if p_token_hash is null or char_length(p_token_hash) < 32 then
    raise exception 'invalid_token' using errcode = '28000';
  end if;

  insert into public.applications (job_id, test_id, video_set_id, survey_id, draft_token_hash, ip_hash)
  values (p_job_id,
          coalesce(v_job.test_id, (select id from public.tests where is_active)),
          coalesce(v_job.video_set_id, (select id from public.video_question_sets where is_active)),
          coalesce(v_job.survey_id, (select id from public.surveys where is_active)),
          p_token_hash, left(p_ip_hash, 128))
  returning * into v;
  update public.applications set current_step = private.app_next_step(v, 'test') where id = v.id;
  return v.id;
end;
$$;

-- Starts the test clock (once). Returns the deadline, or null if untimed.
create function public.app_start_test(p_job_id uuid, p_token_hash text)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare v public.applications; v_limit integer;
begin
  v := private.app_for_token(p_job_id, p_token_hash);
  if v.current_step <> 'test' then raise exception 'wrong_step' using errcode = '22023'; end if;
  if v.test_started_at is null then
    update public.applications set test_started_at = now() where id = v.id returning * into v;
  end if;
  select time_limit_seconds into v_limit from public.tests where id = v.test_id;
  return case when v_limit is null then null else v.test_started_at + make_interval(secs => v_limit) end;
end;
$$;

-- Saves one test answer. Rejected after the time limit (5 s grace for latency).
create function public.app_save_test_answer(p_job_id uuid, p_token_hash text, p_question_id uuid, p_answer jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v public.applications; v_q public.test_questions; v_limit integer; v_opts jsonb; v_text text;
  v_max_len integer;
begin
  v := private.app_for_token(p_job_id, p_token_hash);
  if v.current_step <> 'test' or v.test_started_at is null then
    raise exception 'wrong_step' using errcode = '22023';
  end if;
  select time_limit_seconds into v_limit from public.tests where id = v.test_id;
  if v_limit is not null and now() > v.test_started_at + make_interval(secs => v_limit + 5) then
    raise exception 'time_expired' using errcode = '22023';
  end if;
  select * into v_q from public.test_questions where id = p_question_id and test_id = v.test_id;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;

  -- The answer must match the question type exactly.
  if v_q.type in ('single_choice', 'multi_choice') then
    v_opts := p_answer -> 'options';
    if jsonb_typeof(v_opts) is distinct from 'array' or (select count(*) from jsonb_object_keys(p_answer)) <> 1
       or jsonb_array_length(v_opts) < 1
       or (v_q.type = 'single_choice' and jsonb_array_length(v_opts) <> 1)
       or exists (select 1 from jsonb_array_elements(v_opts) o
                   where jsonb_typeof(o) <> 'number' or (o #>> '{}')::numeric <> floor((o #>> '{}')::numeric)
                      or (o #>> '{}')::int < 0 or (o #>> '{}')::int >= jsonb_array_length(v_q.options))
       or (select count(distinct o) from jsonb_array_elements(v_opts) o) <> jsonb_array_length(v_opts) then
      raise exception 'invalid_answer' using errcode = '22023';
    end if;
  else
    v_text := p_answer ->> 'text';
    v_max_len := 3000;
    if v_q.type = 'short_text' then v_max_len := 500; end if;
    if jsonb_typeof(p_answer -> 'text') is distinct from 'string' or (select count(*) from jsonb_object_keys(p_answer)) <> 1
       or char_length(v_text) > v_max_len then
      raise exception 'invalid_answer' using errcode = '22023';
    end if;
  end if;

  insert into public.application_test_answers (application_id, question_id, answer)
  values (v.id, p_question_id, p_answer)
  on conflict (application_id, question_id) do update set answer = excluded.answer, answered_at = now();
end;
$$;

-- Ends the test (allowed after the deadline) and auto-grades choice questions.
-- Written answers stay ungraded for the admin. The score is never returned.
create function public.app_submit_test(p_job_id uuid, p_token_hash text)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.applications;
begin
  v := private.app_for_token(p_job_id, p_token_hash);
  if v.current_step <> 'test' or v.test_started_at is null then
    raise exception 'wrong_step' using errcode = '22023';
  end if;

  update public.application_test_answers a
     set is_correct = (select array_agg(distinct (o #>> '{}')::smallint order by (o #>> '{}')::smallint)
                         from jsonb_array_elements(a.answer -> 'options') o) = k.correct_options,
         points_awarded = case when (select array_agg(distinct (o #>> '{}')::smallint order by (o #>> '{}')::smallint)
                                       from jsonb_array_elements(a.answer -> 'options') o) = k.correct_options
                               then q.points else 0 end
    from public.test_questions q
    join public.test_answer_keys k on k.question_id = q.id
   where a.application_id = v.id and q.id = a.question_id and q.type in ('single_choice', 'multi_choice');

  update public.applications set
    test_submitted_at = now(),
    test_score = (select coalesce(sum(points_awarded), 0) from public.application_test_answers
                   where application_id = v.id),
    test_max_score = (select coalesce(sum(points), 0) from public.test_questions where test_id = v.test_id),
    current_step = private.app_next_step(v, 'video')
  where id = v.id;
end;
$$;

-- Records an uploaded video answer (the server checked the file first).
-- Returns the storage path it replaced, if any, so the server can delete it.
create function public.app_record_video(
  p_job_id uuid, p_token_hash text, p_question_id uuid, p_storage_path text,
  p_duration_seconds integer, p_size_bytes integer, p_mime_type text)
returns text language plpgsql security definer set search_path = '' as $$
declare v public.applications; v_max integer; v_old text;
begin
  v := private.app_for_token(p_job_id, p_token_hash);
  if v.current_step <> 'video' then raise exception 'wrong_step' using errcode = '22023'; end if;
  select max_seconds into v_max from public.video_questions
   where id = p_question_id and set_id = v.video_set_id and is_active;
  if v_max is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  if p_storage_path not like v.id || '/' || p_question_id || '/%'
     or p_duration_seconds > v_max + 5 then
    raise exception 'invalid_video' using errcode = '22023';
  end if;
  select storage_path into v_old from public.application_videos
   where application_id = v.id and question_id = p_question_id;
  insert into public.application_videos (application_id, question_id, storage_path, duration_seconds, size_bytes, mime_type)
  values (v.id, p_question_id, p_storage_path, greatest(p_duration_seconds, 1), p_size_bytes, p_mime_type)
  on conflict (application_id, question_id) do update set
    storage_path = excluded.storage_path, duration_seconds = excluded.duration_seconds,
    size_bytes = excluded.size_bytes, mime_type = excluded.mime_type, uploaded_at = now();
  return v_old;
end;
$$;

-- Moves on once every video question has an answer.
create function public.app_finish_videos(p_job_id uuid, p_token_hash text)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.applications;
begin
  v := private.app_for_token(p_job_id, p_token_hash);
  if v.current_step <> 'video' then raise exception 'wrong_step' using errcode = '22023'; end if;
  if exists (select 1 from public.video_questions q
              where q.set_id = v.video_set_id and q.is_active
                and not exists (select 1 from public.application_videos a
                                 where a.application_id = v.id and a.question_id = q.id)) then
    raise exception 'incomplete' using errcode = '22023';
  end if;
  update public.applications set current_step = 'survey' where id = v.id;
end;
$$;

-- Final step: contact details, survey answers ({question_id: {...}}) and consent.
-- Links the applicant by phone and submits. The token stops working afterwards.
create function public.app_submit(
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
       where jsonb_typeof(o) <> 'number' or (o #>> '{}')::int < 0
          or (o #>> '{}')::int >= jsonb_array_length(v_q.options))) then
      raise exception 'invalid_answer' using errcode = '22023';
    end if;
    insert into public.application_survey_answers (application_id, question_id, answer)
    values (v.id, v_q.id, v_a)
    on conflict (application_id, question_id) do update set answer = excluded.answer;
  end loop;

  insert into public.applicants (phone_e164, email, full_name)
  values (p_phone_e164, nullif(lower(trim(p_email)), ''), trim(p_full_name))
  on conflict (phone_e164) do update set
    full_name = excluded.full_name, email = coalesce(excluded.email, public.applicants.email)
  returning id into v_applicant;

  insert into public.consents (application_id, text_version, ip_hash)
  values (v.id, p_consent_version, left(p_ip_hash, 128));

  update public.applications set
    applicant_id = v_applicant, status = 'submitted', current_step = 'submitted',
    submitted_at = now(), draft_token_hash = null
  where id = v.id;
  return v.id;
end;
$$;

-- Unfinished applications older than p_hours: returns their video paths and
-- deletes them (the server removes the files first).
create function public.app_cleanup_candidates(p_hours integer)
returns table (application_id uuid, storage_path text)
language sql stable security definer set search_path = '' as $$
  select a.id, v.storage_path
    from public.applications a
    left join public.application_videos v on v.application_id = a.id
   where a.status = 'in_progress' and a.created_at < now() - make_interval(hours => p_hours);
$$;

create function public.app_cleanup(p_application_ids uuid[])
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  delete from public.applications where id = any (p_application_ids) and status = 'in_progress';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function
  private.app_for_token(uuid, text),
  private.app_next_step(public.applications, public.application_step),
  public.app_start(uuid, text, text),
  public.app_start_test(uuid, text),
  public.app_save_test_answer(uuid, text, uuid, jsonb),
  public.app_submit_test(uuid, text),
  public.app_record_video(uuid, text, uuid, text, integer, integer, text),
  public.app_finish_videos(uuid, text),
  public.app_submit(uuid, text, text, text, text, jsonb, text, text, boolean),
  public.app_cleanup_candidates(integer),
  public.app_cleanup(uuid[])
  from public, anon, authenticated;
grant execute on function
  public.app_start(uuid, text, text),
  public.app_start_test(uuid, text),
  public.app_save_test_answer(uuid, text, uuid, jsonb),
  public.app_submit_test(uuid, text),
  public.app_record_video(uuid, text, uuid, text, integer, integer, text),
  public.app_finish_videos(uuid, text),
  public.app_submit(uuid, text, text, text, text, jsonb, text, text, boolean),
  public.app_cleanup_candidates(integer),
  public.app_cleanup(uuid[])
  to service_role;

-- 5. Storage: private bucket for application videos ---------------------------
-- Paths: {application_id}/{question_id}/{uuid}.webm. No public access and no
-- client upload policy: uploads use server-created signed upload URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('application-videos', 'application-videos', false, 104857600, array['video/webm', 'video/mp4'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "application-videos: admin reads" on storage.objects
  for select to authenticated using (bucket_id = 'application-videos' and private.is_mfa_admin());
