-- =============================================================================
-- v2 phase 2: job seekers no longer have accounts
-- =============================================================================
-- Job seekers now apply per job without signing up (added in later phases).
-- This removes the account-based job-seeker model: profiles, contacts, the
-- shared onboarding (survey/test/video/CV), job requests, admin access grants
-- and meetings, plus every function and policy built on them.
-- Employers are invited by an admin; admins come from the create-admin script.
-- =============================================================================

-- 1. Functions that depend on the removed tables --------------------------------
drop function if exists
  public.request_job(uuid, text),
  public.withdraw_job_request(uuid),
  public.employer_respond_to_application(uuid, boolean),
  public.employer_list_applications(uuid),
  public.employee_list_job_requests(),
  public.list_open_jobs(double precision, double precision, double precision, double precision),
  public.get_job(uuid),
  public.employer_list_candidates(integer),
  public.log_candidate_access(uuid, text, text),
  public.respond_to_meeting_request(uuid, boolean, smallint),
  public.employer_update_meeting_request(uuid, public.meeting_status, text),
  public.employee_list_meeting_requests(),
  public.admin_grant_access(uuid, uuid[], text[], timestamptz, text),
  public.admin_revoke_grant(uuid),
  public.admin_set_employee_status(uuid, public.employee_status),
  public.admin_search_employees(text, text, public.employee_status, public.availability, numeric, integer),
  public.admin_set_video_status(uuid, public.video_status),
  public.start_test_attempt(uuid),
  public.save_test_answer(uuid, uuid, smallint),
  public.submit_test_attempt(uuid),
  public.submit_survey_response(uuid),
  public.submit_employee_profile(),
  public.test_question_count(uuid),
  public.record_account_deletion();

-- 2. Policies that reference the removed tables or helpers -----------------------
drop policy if exists "profiles: employer reads granted names" on public.profiles;
drop policy if exists "surveys: employees read active or answered" on public.surveys;
drop policy if exists "survey_questions: readable with parent survey" on public.survey_questions;
drop policy if exists "tests: employees read active or attempted" on public.tests;
drop policy if exists "test_questions: employee during own attempt" on public.test_questions;
drop policy if exists "video_prompts: employees read active" on public.video_prompts;

drop policy if exists "wemuste: employee uploads own files" on storage.objects;
drop policy if exists "wemuste: employee reads own files" on storage.objects;
drop policy if exists "wemuste: employee deletes own files" on storage.objects;
drop policy if exists "wemuste: employer reads granted videos" on storage.objects;
drop policy if exists "wemuste: employer reads granted cvs" on storage.objects;
drop policy if exists "wemuste: admin reads files" on storage.objects;
drop policy if exists "wemuste: admin deletes files" on storage.objects;
-- The cv-documents and video-resumes buckets now have no policies (nobody can
-- read them); scripts/cleanup-v1-job-seekers.mts empties and deletes them.

-- 3. Tables of the account-based job-seeker model --------------------------------
drop table if exists
  public.meeting_requests,
  public.job_applications,
  public.access_grants,
  public.cv_documents,
  public.video_resumes,
  public.test_attempts,
  public.survey_answers,
  public.survey_responses,
  public.consents,
  public.employee_contacts,
  public.employee_profiles;

drop function if exists
  private.has_active_grant(uuid, text),
  private.has_application_access(uuid, text),
  private.has_own_survey_response(uuid),
  private.can_view_prompt_answers(uuid);

drop type if exists public.meeting_status, public.employee_status, public.video_status, public.consent_type;

-- Job-seeker profile rows (their auth users are removed by the cleanup script;
-- the migration role cannot write to the auth schema on hosted Supabase).
delete from public.profiles where role = 'employee';
-- Nobody can hold the old role any more.
alter table public.profiles add constraint profiles_no_job_seekers check (role in ('admin', 'employer'));

-- Content is now read by the server for public applicants (later phases);
-- clients only see it as an admin.
create policy "surveys: admin reads" on public.surveys
  for select to authenticated using (private.is_mfa_admin());
create policy "survey_questions: admin reads" on public.survey_questions
  for select to authenticated using (private.is_mfa_admin());
create policy "tests: admin reads" on public.tests
  for select to authenticated using (private.is_mfa_admin());
create policy "video_prompts: admin reads" on public.video_prompts
  for select to authenticated using (private.is_mfa_admin());

-- 4. Accounts: only employers are provisioned by triggers --------------------------
-- Signup is disabled. Employers are invited by an admin with the service role,
-- which then sets app_metadata.wemuste_role = 'employer' (users can never set
-- app_metadata). Anyone else gets no profile, so no access. Admin profiles are
-- inserted by scripts/create-admin.ts.
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.raw_app_meta_data ->> 'wemuste_role' = 'employer' then
    perform private.provision_employer(new.id, new.email, new.raw_app_meta_data);
  end if;
  return new;
end;
$$;

-- inviteUserByEmail creates the user first; app_metadata arrives in a later
-- update. Provision only accounts that are brand new and have no profile yet.
create or replace function private.handle_app_metadata_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.raw_app_meta_data ->> 'wemuste_role' is distinct from 'employer'
     or old.raw_app_meta_data ->> 'wemuste_role' = 'employer'
     or new.created_at < now() - interval '10 minutes'
     or exists (select 1 from public.profiles where id = new.id) then
    return new;
  end if;
  perform private.provision_employer(new.id, new.email, new.raw_app_meta_data);
  return new;
end;
$$;

-- 5. Account deletion (employers) --------------------------------------------------
create function public.record_account_deletion()
returns void language plpgsql security definer set search_path = '' as $$
declare v_role public.user_role;
begin
  select role into v_role from public.profiles where id = (select auth.uid());
  if v_role is distinct from 'employer' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform private.log_audit('account.deleted', 'user', (select auth.uid()),
                            jsonb_build_object('role', v_role));
end;
$$;
revoke all on function public.record_account_deletion() from public, anon;
grant execute on function public.record_account_deletion() to authenticated;
