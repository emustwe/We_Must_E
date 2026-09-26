-- =============================================================================
-- Sponsors don't see a candidate's gender or age
-- =============================================================================
-- Both are optional now, and choosing candidates by them is discrimination
-- (UAE Labour Law, Article 4). The Wemuste team still sees them in the admin
-- area. Nothing else about the sponsor's view changes.
-- =============================================================================

-- The unlocked candidate, without gender and age.
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
    'profile', coalesce(a.profile, '{}'::jsonb) - 'fullName' - 'phone' - 'email' - 'gender' - 'age' - 'adult',
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
