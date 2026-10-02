-- =============================================================================
-- Question builder: generated interviews that admins attach to jobs
-- =============================================================================
-- An MFA admin enters a job title and description; the server writes the
-- job's own interview content (AI) into the fixed pattern: a 25-question
-- Test (Exam) and a 7-question Video interview (Execute). The Survey (Engage)
-- stays the same for every job. Saving creates the Test and the Video
-- interview in one step (both inactive: they are used only by the jobs they
-- are attached to). An admin then attaches them to a sponsor's job that is
-- still waiting for approval.
-- =============================================================================

create table public.question_builds (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 2 and 120),
  description  text not null check (char_length(description) between 1 and 6000),
  role         jsonb not null check (jsonb_typeof(role) = 'object'),
  test_id      uuid not null references public.tests (id) on delete cascade,
  video_set_id uuid not null references public.video_question_sets (id) on delete cascade,
  created_at   timestamptz not null default now(),
  created_by   uuid references public.profiles (id) on delete set null
);
create index question_builds_created_idx on public.question_builds (created_at desc);
create index question_builds_test_idx on public.question_builds (test_id);
create index question_builds_video_set_idx on public.question_builds (video_set_id);
create index question_builds_creator_idx on public.question_builds (created_by);
alter table public.question_builds enable row level security;
alter table public.question_builds force row level security;
revoke all on public.question_builds from anon, authenticated;
grant select on public.question_builds to authenticated;
create policy "question_builds: MFA admins read" on public.question_builds
  for select to authenticated using (private.is_mfa_admin());

-- Saves a generated interview: p_test is [{type, prompt, options, time}] (25),
-- p_videos is [prompt] (7). Everything is created together, or nothing.
create function public.admin_save_question_build(
  p_title text, p_description text, p_role jsonb, p_test jsonb, p_videos jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_test uuid; v_set uuid; v_id uuid; v_q jsonb; v_i integer := 0;
begin
  perform private.require_mfa_admin();
  if jsonb_typeof(p_test) is distinct from 'array' or jsonb_array_length(p_test) <> 25
     or jsonb_typeof(p_videos) is distinct from 'array' or jsonb_array_length(p_videos) <> 7
     or exists (select 1 from jsonb_array_elements(p_test) q
                 where q ->> 'type' not in ('long_text', 'typing'))
     or exists (select 1 from jsonb_array_elements(p_videos) v where jsonb_typeof(v) <> 'string') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  insert into public.tests (title, time_limit_seconds, pass_score, is_active)
  values (left('Builder — ' || trim(p_title) || ' — Test', 200), 25 * 60, 0, false)
  returning id into v_test;
  for v_q in select * from jsonb_array_elements(p_test) loop
    insert into public.test_questions (test_id, type, prompt, options, time_limit_seconds, position, points)
    values (v_test, (v_q ->> 'type')::public.test_question_type, v_q ->> 'prompt',
            coalesce(v_q -> 'options', '[]'::jsonb), (v_q ->> 'time')::integer, v_i, 0);
    v_i := v_i + 1;
  end loop;

  insert into public.video_question_sets (title, is_active, time_limit_seconds)
  values (left('Builder — ' || trim(p_title) || ' — Video interview', 200), false, 25 * 60)
  returning id into v_set;
  insert into public.video_questions (set_id, prompt, max_seconds, position, is_active)
  select v_set, v #>> '{}', 30, (n - 1)::integer, true
    from jsonb_array_elements(p_videos) with ordinality as t(v, n);

  insert into public.question_builds (title, description, role, test_id, video_set_id, created_by)
  values (trim(p_title), trim(p_description), p_role, v_test, v_set, (select auth.uid()))
  returning id into v_id;
  perform private.log_audit('question_build.created', 'question_build', v_id);
  return v_id;
exception when check_violation or not_null_violation or invalid_text_representation then
  raise exception 'invalid_input' using errcode = '22023';
end;
$$;
revoke all on function public.admin_save_question_build(text, text, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.admin_save_question_build(text, text, jsonb, jsonb, jsonb) to authenticated;

-- Attaches a saved interview to a job that is waiting for approval: the job's
-- Exam and Execute questions become these (its Survey stays). Applications
-- already started keep the questions they began with.
create function public.admin_attach_question_build(p_build_id uuid, p_job_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_build public.question_builds;
begin
  perform private.require_mfa_admin();
  select * into v_build from public.question_builds where id = p_build_id;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  update public.jobs set test_id = v_build.test_id, video_set_id = v_build.video_set_id
   where id = p_job_id and status = 'pending';
  if not found then raise exception 'not_pending' using errcode = '22023'; end if;
  perform private.log_audit('question_build.attached', 'job', p_job_id,
                            jsonb_build_object('build', p_build_id));
end;
$$;
revoke all on function public.admin_attach_question_build(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_attach_question_build(uuid, uuid) to authenticated;
