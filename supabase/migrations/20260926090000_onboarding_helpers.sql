-- =============================================================================
-- Onboarding helpers
-- =============================================================================
-- Test questions are hidden until an attempt starts (RLS), but the intro
-- screen needs to say how many there are. This returns only the count.
create function public.test_question_count(p_test_id uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::int
    from public.test_questions q
    join public.tests t on t.id = q.test_id
   where q.test_id = p_test_id
     and t.is_active
     and (private.current_user_role() = 'employee' or private.is_mfa_admin());
$$;

revoke all on function public.test_question_count(uuid) from public, anon;
grant execute on function public.test_question_count(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Fix: policy recursion between surveys <-> survey_responses and
-- video_prompts <-> video_resumes (found by the onboarding e2e test).
-- Inserting a response/video checked the parent's SELECT policy, which in turn
-- queried the child table under RLS. The parent policies now use SECURITY
-- DEFINER helpers that answer the same question without re-entering RLS.
-- -----------------------------------------------------------------------------
create function private.has_own_survey_response(p_survey_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.survey_responses
                 where survey_id = p_survey_id and employee_id = (select auth.uid()));
$$;

-- A prompt's wording is visible to anyone who may see an answer to it.
create function private.can_view_prompt_answers(p_prompt_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.video_resumes v
    where v.prompt_id = p_prompt_id
      and (v.employee_id = (select auth.uid())
           or (v.status = 'approved' and private.has_active_grant(v.employee_id, 'video')))
  );
$$;

revoke all on function private.has_own_survey_response(uuid), private.can_view_prompt_answers(uuid)
  from public, anon;
grant execute on function private.has_own_survey_response(uuid), private.can_view_prompt_answers(uuid)
  to authenticated;

drop policy "surveys: employees read active or answered" on public.surveys;
create policy "surveys: employees read active or answered" on public.surveys
  for select to authenticated using (
    (private.current_user_role() = 'employee'
      and (is_active or private.has_own_survey_response(id)))
    or private.is_approved_employer()   -- needed to read the wording of granted answers
    or private.is_mfa_admin());

drop policy "video_prompts: employees read active" on public.video_prompts;
create policy "video_prompts: employees read active" on public.video_prompts
  for select to authenticated using (
    (is_active and private.current_user_role() = 'employee')
    or private.can_view_prompt_answers(id)
    or private.is_mfa_admin());
