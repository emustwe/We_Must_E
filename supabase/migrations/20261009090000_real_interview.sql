-- =============================================================================
-- The real interview: Test, Task, Survey
-- =============================================================================
-- 1. A timed typing question in the test (speed, accuracy, backspaces).
-- 2. Task (the middle step) holds the applicant's profile and CV, and one video
--    per video question (e.g. 7 x 30 s). Without video questions the one video
--    explains the test answers, as before.
-- 3. Each step can have its own time limit; when each step started is kept.
-- 4. Survey choice questions may offer "Other" with a typed answer.
-- 5. Jobs can show another company name on the map (practice jobs).
-- =============================================================================

-- 1. Typing questions ---------------------------------------------------------
alter type public.test_question_type add value if not exists 'typing';

-- A typing question has one option: the paragraph to type. Up to 12 choices.
-- (type::text, because the new enum value can't be used in this transaction.)
alter table public.test_questions drop constraint test_questions_options_check;
alter table public.test_questions add constraint test_questions_options_check check (
  jsonb_typeof(options) = 'array' and (
    (type::text in ('short_text', 'long_text') and jsonb_array_length(options) = 0) or
    (type::text = 'typing' and jsonb_array_length(options) = 1) or
    (type::text in ('single_choice', 'multi_choice') and jsonb_array_length(options) between 2 and 12)));
alter table public.test_questions
  add column time_limit_seconds integer check (time_limit_seconds between 10 and 600);

-- 2. Time limits per step, and when each step started ---------------------------
alter table public.video_question_sets
  add column time_limit_seconds integer check (time_limit_seconds between 60 and 7200);
alter table public.surveys
  add column time_limit_seconds integer check (time_limit_seconds between 60 and 7200);

alter table public.applications
  add column profile jsonb check (profile is null or (jsonb_typeof(profile) = 'object'
                                   and pg_column_size(profile) <= 16384)),
  add column cv_path text check (char_length(cv_path) <= 300),
  add column task_started_at timestamptz,
  add column survey_started_at timestamptz;

create function private.applications_step_clock()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.current_step = 'video' and new.task_started_at is null then new.task_started_at := now(); end if;
  if new.current_step = 'survey' and new.survey_started_at is null then new.survey_started_at := now(); end if;
  return new;
end;
$$;
create trigger step_clock before insert or update of current_step on public.applications
  for each row execute function private.applications_step_clock();

-- 3. Jobs: full profile on the Task step; another company name on the map -------
alter table public.jobs
  add column full_profile boolean not null default false,
  add column display_company text check (char_length(display_company) between 2 and 120);

create or replace function public.get_public_jobs(
  min_lat double precision, min_lng double precision,
  max_lat double precision, max_lng double precision)
returns table (
  id uuid, title text, description text, location_label text,
  public_lat double precision, public_lng double precision, published_at timestamptz,
  sponsor_name text, sponsor_logo text, country_code text, country_name text, city text)
language sql stable security definer set search_path = '' as $$
  select j.id, j.title, j.description, j.location_label, j.public_lat, j.public_lng, j.published_at,
         coalesce(j.display_company, e.company_name),
         case when j.display_company is null then e.logo_path end,
         j.country_code, j.country_name, j.city
    from public.jobs j
    join public.employer_profiles e on e.user_id = j.employer_id
   where j.status = 'published'
     and e.status = 'approved'
     and j.public_lat between least(min_lat, max_lat) and greatest(min_lat, max_lat)
     and j.public_lng between least(min_lng, max_lng) and greatest(min_lng, max_lng)
   order by j.published_at desc
   limit 1000;
$$;

-- 4. Every application has a Task step (it holds the contact details) ------------
create or replace function private.app_next_step(p_app public.applications, p_from public.application_step)
returns public.application_step language plpgsql stable security definer set search_path = '' as $$
begin
  if p_from = 'test' and exists (select 1 from public.test_questions where test_id = p_app.test_id) then
    return 'test';
  end if;
  if p_from in ('test', 'video') then return 'video'; end if;
  return 'survey';
end;
$$;

-- 5. Test answers, including typing -----------------------------------------------
-- Typing: {"text": "...", "stats": {"seconds": n, "backspaces": n, "keystrokes": n}}.
create or replace function public.app_save_test_answer(p_job_id uuid, p_token_hash text, p_question_id uuid, p_answer jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v public.applications; v_q public.test_questions; v_limit integer; v_opts jsonb; v_text text;
  v_max_len integer; v_stats jsonb;
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

  if v_q.type::text in ('single_choice', 'multi_choice') then
    v_opts := p_answer -> 'options';
    if jsonb_typeof(v_opts) is distinct from 'array' or (select count(*) from jsonb_object_keys(p_answer)) <> 1
       or jsonb_array_length(v_opts) < 1
       or (v_q.type::text = 'single_choice' and jsonb_array_length(v_opts) <> 1)
       or exists (select 1 from jsonb_array_elements(v_opts) o
                   where jsonb_typeof(o) <> 'number' or (o #>> '{}')::numeric <> floor((o #>> '{}')::numeric)
                      or (o #>> '{}')::int < 0 or (o #>> '{}')::int >= jsonb_array_length(v_q.options))
       or (select count(distinct o) from jsonb_array_elements(v_opts) o) <> jsonb_array_length(v_opts) then
      raise exception 'invalid_answer' using errcode = '22023';
    end if;
  elsif v_q.type::text = 'typing' then
    v_text := p_answer ->> 'text';
    v_stats := p_answer -> 'stats';
    if jsonb_typeof(p_answer -> 'text') is distinct from 'string' or char_length(v_text) > 3000
       or jsonb_typeof(v_stats) is distinct from 'object'
       or exists (select 1 from jsonb_object_keys(p_answer) k where k not in ('text', 'stats'))
       or exists (select 1 from jsonb_each(v_stats) s
                   where s.key not in ('seconds', 'backspaces', 'keystrokes')
                      or jsonb_typeof(s.value) <> 'number'
                      or (s.value #>> '{}')::numeric not between 0 and 100000) then
      raise exception 'invalid_answer' using errcode = '22023';
    end if;
  else
    v_text := p_answer ->> 'text';
    v_max_len := 3000;
    if v_q.type::text = 'short_text' then v_max_len := 500; end if;
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

-- 6. Task: profile, CV, one video per question ---------------------------------------
-- The profile is saved as the applicant fills the Task page; the server checks
-- every field. Name and phone are needed to finish the step.
create function public.app_save_profile(p_job_id uuid, p_token_hash text, p_profile jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.applications;
begin
  v := private.app_for_token(p_job_id, p_token_hash);
  if v.current_step <> 'video' then raise exception 'wrong_step' using errcode = '22023'; end if;
  if jsonb_typeof(p_profile) is distinct from 'object' or pg_column_size(p_profile) > 16384
     or char_length(coalesce(p_profile ->> 'fullName', '')) not between 2 and 120
     or coalesce(p_profile ->> 'phone', '') !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  update public.applications set profile = p_profile where id = v.id;
end;
$$;

-- The CV file (the server checked it). Returns the path it replaced, if any.
create function public.app_record_cv(p_job_id uuid, p_token_hash text, p_storage_path text)
returns text language plpgsql security definer set search_path = '' as $$
declare v public.applications;
begin
  v := private.app_for_token(p_job_id, p_token_hash);
  if v.current_step <> 'video' then raise exception 'wrong_step' using errcode = '22023'; end if;
  if p_storage_path not like v.id || '/cv/%' or char_length(p_storage_path) > 300 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  update public.applications set cv_path = p_storage_path where id = v.id;
  return v.cv_path;
end;
$$;

create unique index application_videos_one_per_question
  on public.application_videos (application_id, question_id) where question_id is not null;

-- One question's video (replacing an earlier one). Returns the replaced path.
create function public.app_record_question_video(
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
  if p_storage_path not like v.id || '/' || p_question_id || '/%' or p_duration_seconds > v_max + 5 then
    raise exception 'invalid_video' using errcode = '22023';
  end if;
  delete from public.application_videos
   where application_id = v.id and question_id = p_question_id
  returning storage_path into v_old;
  insert into public.application_videos (application_id, question_id, storage_path, duration_seconds, size_bytes, mime_type)
  values (v.id, p_question_id, p_storage_path, greatest(p_duration_seconds, 1), p_size_bytes, p_mime_type);
  return v_old;
end;
$$;

-- Finishing Task: contact details saved, and every video question answered (or,
-- without video questions, the one video when there was a test).
create or replace function public.app_finish_videos(p_job_id uuid, p_token_hash text)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.applications;
begin
  v := private.app_for_token(p_job_id, p_token_hash);
  if v.current_step <> 'video' then raise exception 'wrong_step' using errcode = '22023'; end if;
  if v.profile is null or v.profile ->> 'fullName' is null or v.profile ->> 'phone' is null then
    raise exception 'incomplete' using errcode = '22023';
  end if;
  if exists (select 1 from public.video_questions where set_id = v.video_set_id and is_active) then
    if exists (select 1 from public.video_questions q
                where q.set_id = v.video_set_id and q.is_active
                  and not exists (select 1 from public.application_videos a
                                   where a.application_id = v.id and a.question_id = q.id)) then
      raise exception 'incomplete' using errcode = '22023';
    end if;
  elsif exists (select 1 from public.test_questions where test_id = v.test_id)
        and not exists (select 1 from public.application_videos where application_id = v.id) then
    raise exception 'incomplete' using errcode = '22023';
  end if;
  update public.applications set current_step = 'survey' where id = v.id;
end;
$$;

-- 7. CV files: private bucket; admins, and the sponsor once unlocked, may read -------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('application-cvs', 'application-cvs', false, 5242880,
        array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "application-cvs: admin reads" on storage.objects
  for select to authenticated using (bucket_id = 'application-cvs' and private.is_mfa_admin());
create policy "application-cvs: sponsor reads unlocked" on storage.objects
  for select to authenticated using (
    bucket_id = 'application-cvs'
    and private.employer_can_see_application(private.try_uuid((storage.foldername(name))[1])));

-- Opening a CV is logged, like a video view.
create function public.log_cv_view(p_application_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not (private.is_mfa_admin() or private.employer_can_see_application(p_application_id)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform private.log_audit('application.cv_viewed', 'application', p_application_id);
end;
$$;

-- 8. The sponsor's view of an unlocked candidate: now with profile, CV and the
--    question each video answers.
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
    'profile', coalesce(a.profile, '{}'::jsonb) - 'fullName' - 'phone' - 'email',
    'has_cv', a.cv_path is not null,
    'cv_path', a.cv_path,
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
    join public.applicants p on p.id = a.applicant_id
   where a.id = p_application_id;
  return v;
end;
$$;

-- 9. Grants -------------------------------------------------------------------------
revoke all on function
  private.applications_step_clock(),
  public.app_save_profile(uuid, text, jsonb),
  public.app_record_cv(uuid, text, text),
  public.app_record_question_video(uuid, text, uuid, text, integer, integer, text),
  public.log_cv_view(uuid)
  from public, anon, authenticated;
grant execute on function
  public.app_save_profile(uuid, text, jsonb),
  public.app_record_cv(uuid, text, text),
  public.app_record_question_video(uuid, text, uuid, text, integer, integer, text)
  to service_role;
grant execute on function public.log_cv_view(uuid) to authenticated;
