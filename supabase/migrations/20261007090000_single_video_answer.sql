-- =============================================================================
-- One video per application
-- =============================================================================
-- Applicants see all video questions of the set on one page and answer them
-- in a single video. It is stored against the set's first question (the
-- "anchor"); its length limit is the sum of the questions' limits, at most
-- 5 minutes.

-- The first live question of a set (where the one video is stored).
create function private.video_anchor(p_set_id uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.video_questions
   where set_id = p_set_id and is_active
   order by position, created_at
   limit 1;
$$;

-- Total time for the one video: the questions' limits added up, 5 minutes max.
create function private.video_limit_seconds(p_set_id uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select least(coalesce(sum(max_seconds), 0), 300)::integer
    from public.video_questions where set_id = p_set_id and is_active;
$$;

create or replace function public.app_record_video(
  p_job_id uuid, p_token_hash text, p_question_id uuid, p_storage_path text,
  p_duration_seconds integer, p_size_bytes integer, p_mime_type text)
returns text language plpgsql security definer set search_path = '' as $$
declare v public.applications; v_old text;
begin
  v := private.app_for_token(p_job_id, p_token_hash);
  if v.current_step <> 'video' then raise exception 'wrong_step' using errcode = '22023'; end if;
  -- The single answer video belongs to the set's first question.
  if p_question_id is distinct from private.video_anchor(v.video_set_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if p_storage_path not like v.id || '/' || p_question_id || '/%'
     or p_duration_seconds > private.video_limit_seconds(v.video_set_id) + 5 then
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

-- The video step is done once the one video is uploaded.
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

-- Sponsors: all the questions of the set, plus the answer video(s).
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
    'test_percent', a.test_percent, 'submitted_at', a.submitted_at, 'approved_at', a.reviewed_at,
    'survey', coalesce((
      select jsonb_agg(jsonb_build_object('prompt', q.prompt, 'type', q.type, 'options', q.options,
                                          'answer', s.answer) order by q.position)
        from public.survey_questions q
        join public.application_survey_answers s on s.question_id = q.id and s.application_id = a.id), '[]'),
    'video_questions', coalesce((
      select jsonb_agg(q.prompt order by q.position)
        from public.video_questions q where q.set_id = a.video_set_id and q.is_active), '[]'),
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

revoke all on function private.video_anchor(uuid), private.video_limit_seconds(uuid) from public, anon, authenticated;
