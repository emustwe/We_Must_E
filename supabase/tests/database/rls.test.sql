-- Row Level Security and privilege tests. Run with `npx supabase test db`.
-- Every check signs in as a real role (JWT claims + `authenticated`/`anon`)
-- and everything is rolled back at the end.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

-- ---------------------------------------------------------------------------
-- Helpers (run as postgres; switch role only for the query under test)
-- ---------------------------------------------------------------------------
create schema tests;

create function tests.act_as(p_uid uuid, p_aal text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when p_uid is null then '{"role":"anon"}'
         else json_build_object('sub', p_uid, 'role', 'authenticated', 'aal', p_aal)::text end, true);
  perform set_config('role', case when p_uid is null then 'anon' else 'authenticated' end, true);
end $$;

-- Row count of a query as a user; -1 if the query is refused.
create function tests.rows_as(p_uid uuid, p_sql text, p_aal text default 'aal1')
returns int language plpgsql as $$
declare v int;
begin
  perform tests.act_as(p_uid, p_aal);
  begin
    execute 'select count(*) from (' || p_sql || ') q' into v;
  exception when others then v := -1;
  end;
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  return v;
end $$;

-- True when a statement is refused or changes nothing (both are denials under RLS).
create function tests.denied_as(p_uid uuid, p_sql text, p_aal text default 'aal1')
returns boolean language plpgsql as $$
declare v_rows int := 0; v_denied boolean := false;
begin
  perform tests.act_as(p_uid, p_aal);
  begin
    execute p_sql;
    get diagnostics v_rows = row_count;
  exception when others then v_denied := true;
  end;
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  return v_denied or v_rows = 0;
end $$;

-- Runs a statement as a user and fails the test run if it errors.
create function tests.run_as(p_uid uuid, p_sql text, p_aal text default 'aal1')
returns void language plpgsql as $$
begin
  perform tests.act_as(p_uid, p_aal);
  execute p_sql;
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end $$;

-- ---------------------------------------------------------------------------
-- Fixtures (start from an empty database; the local seed is rolled back too)
-- ---------------------------------------------------------------------------
delete from public.jobs;
delete from public.test_attempts;
delete from public.tests;
delete from public.video_resumes;
delete from public.video_prompts;
delete from public.survey_responses;
delete from public.surveys;
delete from auth.users;

-- Employees sign up publicly; employers are created with app_metadata (service role only).
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.local',
   '{"full_name":"Emp A","consents":{"terms":"1","privacy":"1","data_sharing":"1"}}', '{}'),
  ('00000000-0000-0000-0000-0000000000b1', 'b@test.local',
   '{"full_name":"Emp B","consents":{"terms":"1","privacy":"1","data_sharing":"1"}}', '{}'),
  ('00000000-0000-0000-0000-0000000000c1', 'c@test.local', '{"full_name":"Emp C"}', '{}'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@test.local', '{}', '{}'),
  ('00000000-0000-0000-0000-0000000000ee', 'sneaky@test.local', '{"role":"employer","company_name":"Fake"}', '{}'),
  ('00000000-0000-0000-0000-0000000000ff', 'sneaky2@test.local', '{"role":"admin"}', '{}');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000ad';
delete from public.employee_profiles where user_id = '00000000-0000-0000-0000-0000000000ad';
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'e1@test.local', '{}',
   '{"wemuste_role":"employer","company_name":"Acme","contact_person":"Boss","created_by":"00000000-0000-0000-0000-0000000000ad"}'),
  ('00000000-0000-0000-0000-0000000000e2', 'e2@test.local', '{}',
   '{"wemuste_role":"employer","company_name":"Pending Co"}');

-- Auth admin API path: insert first, then app_metadata in a separate update.
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000e3', 'e3@test.local', '{}', '{}');
update auth.users set raw_app_meta_data = '{"wemuste_role":"employer","company_name":"Late Meta Co"}'
 where id = '00000000-0000-0000-0000-0000000000e3';

\set A  '''00000000-0000-0000-0000-0000000000a1'''
\set B  '''00000000-0000-0000-0000-0000000000b1'''
\set C  '''00000000-0000-0000-0000-0000000000c1'''
\set AD '''00000000-0000-0000-0000-0000000000ad'''
\set E1 '''00000000-0000-0000-0000-0000000000e1'''
\set E2 '''00000000-0000-0000-0000-0000000000e2'''

-- ---------------------------------------------------------------------------
-- Signup and roles
-- ---------------------------------------------------------------------------
select is((select role::text from profiles where id = '00000000-0000-0000-0000-0000000000ee'), 'employee',
  'user_metadata role=employer does not create an employer');
select is((select role::text from profiles where id = '00000000-0000-0000-0000-0000000000ff'), 'employee',
  'user_metadata role=admin does not create an admin');
select is((select role::text from profiles where id = :E1), 'employer', 'app_metadata creates an employer');
select is((select status::text from employer_profiles where user_id = :E1), 'pending', 'new employers start pending');
select ok((select must_change_password from employer_profiles where user_id = :E1), 'new employers must change password');
select is((select created_by from employer_profiles where user_id = :E1), :AD::uuid, 'created_by is recorded for admins');
select is((select created_by from employer_profiles where user_id = :E2), null, 'created_by ignored when not an admin');
select is((select count(*)::int from consents where user_id = :A), 3, 'employee consents recorded at signup');
select is((select role::text from profiles where id = '00000000-0000-0000-0000-0000000000e3'), 'employer',
  'app_metadata written after insert (Auth admin API) creates an employer');
select is((select company_name from employer_profiles where user_id = '00000000-0000-0000-0000-0000000000e3'), 'Late Meta Co',
  'late app_metadata fills the employer profile');
select is((select count(*)::int from employee_profiles where user_id = '00000000-0000-0000-0000-0000000000e3'), 0,
  'converted account has no employee profile left');

-- Admin approves (MFA required).
select ok(tests.denied_as(:AD, format('select admin_set_employer_status(%L, ''approved'')', :E1)),
  'admin without MFA cannot approve employers');
select is(tests.rows_as(:AD, 'select 1 from employee_profiles'), 0, 'admin without MFA reads no employees');
select tests.run_as(:AD, format('select admin_set_employer_status(%L, ''approved'')', :E1), 'aal2');
select tests.run_as(:AD, format('select admin_set_employee_status(%L, ''approved'')', :A), 'aal2');
select tests.run_as(:AD, format('select admin_set_employee_status(%L, ''approved'')', :B), 'aal2');
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"wemuste_role":"employer"}' where id = :A;
select is((select role::text from profiles where id = :A), 'employee', 'an approved employee is never converted to employer');
update auth.users set raw_app_meta_data = raw_app_meta_data - 'wemuste_role' where id = :A;
select is((select approved_by from employer_profiles where user_id = :E1), :AD::uuid, 'approval records the admin');

-- ---------------------------------------------------------------------------
-- 1. Anonymous users read nothing
-- ---------------------------------------------------------------------------
select is(tests.rows_as(null, 'select 1 from profiles'), -1, 'anon: profiles refused');
select is(tests.rows_as(null, 'select 1 from employee_profiles'), -1, 'anon: employee_profiles refused');
select is(tests.rows_as(null, 'select 1 from jobs'), -1, 'anon: jobs refused');
select ok(tests.denied_as(null, 'select * from list_open_jobs()'), 'anon: cannot list jobs');
select is((select count(*)::int from information_schema.role_table_grants
            where grantee = 'anon' and table_schema = 'public'), 0, 'anon has no table privileges');

-- ---------------------------------------------------------------------------
-- 2. Employee A cannot read Employee B
-- ---------------------------------------------------------------------------
select is(tests.rows_as(:A, 'select 1 from employee_profiles'), 1, 'employee sees only own profile');
select is(tests.rows_as(:A, format('select 1 from employee_contacts where user_id = %L', :B)), 0,
  'employee cannot read another employee''s contacts');
select is(tests.rows_as(:A, 'select 1 from employer_profiles'), 0, 'employee cannot read employer_profiles');

-- ---------------------------------------------------------------------------
-- 3-4. Employers without access see nothing; profile-only grants are limited
-- ---------------------------------------------------------------------------
insert into video_prompts (id, prompt) values ('00000000-0000-0000-0000-00000000f001', '[SAMPLE] Tell us about yourself');
insert into video_resumes (employee_id, prompt_id, storage_path, status) values
  (:A, '00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000a1/v.webm', 'approved'),
  (:B, '00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000b1/v.webm', 'approved');

select is(tests.rows_as(:E1, 'select 1 from employee_profiles'), 0, 'employer without access: 0 employees');
select is(tests.rows_as(:E1, 'select * from employer_list_candidates()'), 0, 'employer without access: 0 candidates');
select tests.run_as(:AD, format('select admin_grant_access(%L, array[%L]::uuid[], array[''profile''])', :E1, :A), 'aal2');
select is(tests.rows_as(:E1, 'select 1 from employee_profiles'), 1, 'profile grant: exactly the granted employee');
select is(tests.rows_as(:E1, 'select 1 from employee_contacts'), 0, 'profile grant: no contacts');
select is(tests.rows_as(:E1, 'select 1 from video_resumes'), 0, 'profile grant: no videos');
select is(tests.rows_as(:E1, 'select 1 from profiles where id <> auth.uid()'), 0, 'profile grant: no names');
select is(tests.rows_as(:E1, 'select 1 from access_grants'), 0, 'employers never read grant rows');

-- ---------------------------------------------------------------------------
-- 5. Revoked and expired grants give zero access
-- ---------------------------------------------------------------------------
update access_grants set expires_at = now() - interval '1 minute' where revoked_at is null;
select is(tests.rows_as(:E1, 'select 1 from employee_profiles'), 0, 'expired grant: 0 access');
update access_grants set expires_at = null where revoked_at is null;
select tests.run_as(:AD, 'select admin_revoke_grant((select id from access_grants where revoked_at is null))', 'aal2');
select is(tests.rows_as(:E1, 'select 1 from employee_profiles'), 0, 'revoked grant: 0 access');

-- ---------------------------------------------------------------------------
-- Jobs: posting, the map, and location privacy
-- ---------------------------------------------------------------------------
select ok(tests.denied_as(:E2, format($$insert into jobs (employer_id, title, description, category, schedule,
  pay_min, pay_period, city_emirate, area_label, lat, lng) values (%L, 'Barista', 'Morning shifts at our cafe.',
  'hospitality', '{weekends}', 25, 'hour', 'Dubai', 'Dubai Marina', 25.08, 55.14)$$, :E2)),
  'pending employer cannot post jobs');
select tests.run_as(:E1, format($$insert into jobs (employer_id, title, description, category, schedule,
  pay_min, pay_max, pay_period, city_emirate, area_label, address, lat, lng) values
  (%L, 'Barista', 'Morning shifts at our cafe.', 'hospitality',
   '{weekends}', 25, 35, 'hour', 'Dubai', 'Dubai Marina', 'Marina Walk, Shop 12', 25.0800, 55.1400)$$, :E1));
-- Employers cannot choose ids; give the fixture a known one as the owner.
update jobs set id = '00000000-0000-0000-0000-00000000ab01' where employer_id = :E1;
select ok(tests.denied_as(:E1, format($$insert into jobs (employer_id, title, description, category, schedule,
  pay_min, pay_period, city_emirate, area_label, lat, lng) values (%L, 'Other', 'Posted as someone else.',
  'retail', '{weekends}', 25, 'hour', 'Dubai', 'JLT', 25.07, 55.14)$$, :E2)),
  'employer cannot post a job for another employer');
select ok(tests.denied_as(:E1, $$update jobs set public_lat = 25.08$$), 'employer cannot set the public pin');

select ok((select abs(public_lat - lat) + abs(public_lng - lng) > 0.001 from jobs), 'public pin is offset from the real location');
select ok((select 111320 * sqrt(power(public_lat - lat, 2) + power((public_lng - lng) * cos(radians(lat)), 2))
             between 200 and 650 from jobs), 'offset is roughly 250-600 m');
update jobs set title = 'Barista (weekends)';
select ok((select public_lat from jobs) = (select public_lat from jobs), 'editing other fields keeps the same pin');

select is(tests.rows_as(:A, 'select 1 from jobs'), 0, 'employees cannot read the jobs table (exact location)');
select is(tests.rows_as(:A, 'select * from list_open_jobs()'), 1, 'employees see open jobs on the map');
select is(tests.rows_as(:A, 'select * from list_open_jobs() where lat = 25.08 and lng = 55.14'), 0,
  'map returns the offset pin, not the real location');
select is(tests.rows_as(:A, $$select * from get_job('00000000-0000-0000-0000-00000000ab01') where exact_address is null and exact_lat is null$$), 1,
  'job detail hides the exact address before acceptance');
select is(tests.rows_as(:E1, 'select * from list_open_jobs()'), -1, 'employers cannot browse the job map');

-- ---------------------------------------------------------------------------
-- Job requests: limited profile, contact on accept
-- ---------------------------------------------------------------------------
select ok(tests.denied_as(:C, $$select request_job('00000000-0000-0000-0000-00000000ab01')$$),
  'an unfinished profile cannot send requests');
select ok(tests.denied_as(:A, $$insert into job_applications (job_id, employee_id, employer_id)
  values ('00000000-0000-0000-0000-00000000ab01', auth.uid(), '00000000-0000-0000-0000-0000000000e1')$$),
  'requests cannot be inserted directly');
select tests.run_as(:A, $$select request_job('00000000-0000-0000-0000-00000000ab01', 'I have 2 years of barista experience.')$$);
select ok(tests.denied_as(:A, $$select request_job('00000000-0000-0000-0000-00000000ab01')$$), 'cannot request the same job twice');

select is(tests.rows_as(:E1, 'select 1 from employee_profiles'), 1, 'pending request: employer sees the applicant profile');
select is(tests.rows_as(:E1, 'select 1 from video_resumes'), 1, 'pending request: employer sees the approved video');
select is(tests.rows_as(:E1, 'select 1 from employee_contacts'), 0, 'pending request: no contact details');
select is(tests.rows_as(:E1, 'select 1 from profiles where id <> auth.uid()'), 0, 'pending request: no name');
select is(tests.rows_as(:E1, $$select * from employer_list_applications('00000000-0000-0000-0000-00000000ab01')
  where full_name is null and phone is null and email is null$$), 1, 'applicant list hides name and contact while pending');
select is(tests.rows_as(:E2, 'select 1 from job_applications'), 0, 'other employers cannot see the request');
select ok(tests.denied_as(:E2, $$select * from employer_list_applications('00000000-0000-0000-0000-00000000ab01')$$),
  'other employers cannot list the applicants');
select ok(tests.denied_as(:A, $$select employer_respond_to_application((select id from job_applications), true)$$),
  'employees cannot accept their own request');

select tests.run_as(:E1, $$select employer_respond_to_application((select id from job_applications), true)$$);
select is(tests.rows_as(:E1, 'select 1 from employee_contacts'), 1, 'accepted request: contact details unlocked');
select is(tests.rows_as(:E1, $$select * from employer_list_applications('00000000-0000-0000-0000-00000000ab01')
  where full_name = 'Emp A' and email = 'a@test.local'$$), 1, 'accepted request: applicant list shows name and email');
select is(tests.rows_as(:A, $$select * from get_job('00000000-0000-0000-0000-00000000ab01')
  where exact_address = 'Marina Walk, Shop 12' and exact_lat = 25.08$$), 1, 'accepted request: employee sees the exact address');
select is(tests.rows_as(:B, $$select * from get_job('00000000-0000-0000-0000-00000000ab01') where exact_address is not null$$), 0,
  'other employees still do not see the exact address');
select is((select count(*)::int from audit_logs where action = 'application.accepted'
            and target_id = (select id from job_applications)), 1, 'acceptance is audited');

select tests.run_as(:A, 'select withdraw_job_request((select id from job_applications))');
select is(tests.rows_as(:E1, 'select 1 from employee_profiles'), 0, 'withdrawn request: access ends');

-- ---------------------------------------------------------------------------
-- 6. Suspended employers and hidden employees
-- ---------------------------------------------------------------------------
select tests.run_as(:A, $$select request_job('00000000-0000-0000-0000-00000000ab01')$$);
select is(tests.rows_as(:E1, 'select 1 from employee_profiles'), 1, 're-request after withdrawing works');
select tests.run_as(:AD, format('select admin_set_employer_status(%L, ''suspended'')', :E1), 'aal2');
select is(tests.rows_as(:E1, 'select 1 from employee_profiles'), 0, 'suspended employer: 0 access despite a request');
select is(tests.rows_as(:A, 'select * from list_open_jobs()'), 0, 'suspended employer''s jobs leave the map');
select ok(tests.denied_as(:E1, $$update jobs set title = 'Changed'$$), 'suspended employer cannot edit jobs');
select tests.run_as(:AD, format('select admin_set_employer_status(%L, ''approved'')', :E1), 'aal2');
select tests.run_as(:AD, format('select admin_set_employee_status(%L, ''hidden'')', :A), 'aal2');
select is(tests.rows_as(:E1, 'select 1 from employee_profiles'), 0, 'hidden employee: invisible even with a request');
select is(tests.rows_as(:E2, 'select 1 from employee_profiles'), 0, 'pending employer: 0 access');

-- Admin moderation.
select tests.run_as(:AD, $$select admin_set_job_status('00000000-0000-0000-0000-00000000ab01', 'removed')$$, 'aal2');
select is(tests.rows_as(:B, 'select * from list_open_jobs()'), 0, 'removed jobs leave the map');
select ok(tests.denied_as(:E1, $$update jobs set status = 'open'$$), 'employer cannot undo an admin removal');

-- ---------------------------------------------------------------------------
-- Onboarding writes as a real employee (regression: policy recursion)
-- ---------------------------------------------------------------------------
insert into surveys (id, title, is_active) values ('00000000-0000-0000-0000-00000000aa01', '[SAMPLE] Survey', true);
insert into survey_questions (id, survey_id, type, prompt, options, position) values
  ('00000000-0000-0000-0000-00000000aa02', '00000000-0000-0000-0000-00000000aa01', 'single_choice', '[SAMPLE] Q', '["a","b"]', 0);
select lives_ok(format($$select tests.run_as(%L, 'insert into survey_responses (employee_id, survey_id)
  values (auth.uid(), ''00000000-0000-0000-0000-00000000aa01'')')$$, :C),
  'employee can start the active survey');
select lives_ok(format($$select tests.run_as(%L, 'insert into survey_answers (response_id, question_id, answer)
  values ((select id from survey_responses where employee_id = auth.uid()), ''00000000-0000-0000-0000-00000000aa02'', ''"a"'')')$$, :C),
  'employee can save a survey answer');
select ok(tests.denied_as(:B, $$insert into survey_answers (response_id, question_id, answer)
  values ((select id from survey_responses where employee_id = '00000000-0000-0000-0000-0000000000c1'), '00000000-0000-0000-0000-00000000aa02', '"b"')$$),
  'employee cannot answer on someone else''s response');
select lives_ok(format($$select tests.run_as(%L, 'insert into video_resumes (employee_id, prompt_id, storage_path, duration_seconds)
  values (auth.uid(), ''00000000-0000-0000-0000-00000000f001'', ''00000000-0000-0000-0000-0000000000c1/x.webm'', 20)')$$, :C),
  'employee can register a video answer');
select ok(tests.denied_as(:C, $$insert into video_resumes (employee_id, prompt_id, storage_path, duration_seconds)
  values (auth.uid(), '00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000a1/y.webm', 20)$$),
  'video path must be inside the employee''s own folder');
select ok(tests.denied_as(:C, $$insert into video_resumes (employee_id, prompt_id, storage_path, duration_seconds)
  values (auth.uid(), '00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000c1/z.webm', 999)$$),
  'video longer than the prompt limit is rejected');
select is(tests.rows_as(:C, 'select 1 from video_prompts'), 1, 'employee reads the active prompt');
select is(tests.rows_as(:E2, 'select 1 from video_prompts'), 0, 'pending employer reads no prompts');

-- ---------------------------------------------------------------------------
-- 7. Test answer keys are unreadable
-- ---------------------------------------------------------------------------
insert into tests (id, title, time_limit_seconds, pass_score, is_active)
values ('00000000-0000-0000-0000-00000000c001', '[SAMPLE] Test', 600, 50, true);
insert into test_questions (id, test_id, prompt, options, position) values
  ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-00000000c001', '[SAMPLE] Q1', '["a","b"]', 0),
  ('00000000-0000-0000-0000-00000000d002', '00000000-0000-0000-0000-00000000c001', '[SAMPLE] Q2', '["a","b"]', 1);
select tests.run_as(:AD, $$select admin_set_answer_key('00000000-0000-0000-0000-00000000d001', 1::smallint)$$, 'aal2');
select tests.run_as(:AD, $$select admin_set_answer_key('00000000-0000-0000-0000-00000000d002', 0::smallint)$$, 'aal2');
select is(tests.rows_as(:B, 'select 1 from test_answer_keys'), -1, 'employee: answer keys refused');
select is(tests.rows_as(:E1, 'select 1 from test_answer_keys'), -1, 'employer: answer keys refused');
select is(tests.rows_as(:AD, 'select 1 from test_answer_keys', 'aal2'), -1, 'admin: no direct read of answer keys');
select is(tests.rows_as(:B, 'select 1 from test_questions'), 0, 'test questions hidden before the attempt starts');
select tests.run_as(:B, $$select start_test_attempt('00000000-0000-0000-0000-00000000c001')$$);
select tests.run_as(:B, $$select save_test_answer((select id from test_attempts), '00000000-0000-0000-0000-00000000d001', 1::smallint)$$);
select tests.run_as(:B, $$select save_test_answer((select id from test_attempts), '00000000-0000-0000-0000-00000000d002', 1::smallint)$$);
select ok(tests.denied_as(:B, 'update test_attempts set score = 100'), 'employees cannot write their score');
select tests.run_as(:B, 'select submit_test_attempt((select id from test_attempts))');
select is((select score from test_attempts), 50.00::numeric, 'grading happens server-side');
update test_attempts set started_at = now() - interval '1 hour', submitted_at = null;
select ok(tests.denied_as(:B, $$select save_test_answer((select id from test_attempts), '00000000-0000-0000-0000-00000000d001', 0::smallint)$$),
  'answers after the time limit are rejected');

-- ---------------------------------------------------------------------------
-- Admin panel functions
-- ---------------------------------------------------------------------------
select ok(tests.denied_as(:B, 'select * from admin_search_employees()'), 'employees cannot search employees');
select ok(tests.denied_as(:E1, 'select * from admin_search_employees()'), 'employers cannot search employees');
select ok(tests.denied_as(:AD, 'select * from admin_search_employees()'), 'admin without MFA cannot search employees');
select ok(tests.rows_as(:AD, 'select * from admin_search_employees()', 'aal2') >= 3, 'MFA admin can search employees');
select is(tests.rows_as(:AD, $$select * from admin_search_employees('Emp B')$$, 'aal2'), 1, 'search by name');
select is(tests.rows_as(:AD, $$select * from admin_search_employees(null, null, null, null, 90)$$, 'aal2'), 0, 'min test score filter');

select ok(tests.denied_as(:C, $$update video_resumes set status = 'approved'$$), 'employees cannot approve their own video');
select ok(tests.denied_as(:AD, $$update video_resumes set status = 'approved'$$, 'aal2'), 'video status only changes through the audited function');
select tests.run_as(:AD, $$select admin_set_video_status((select id from video_resumes where employee_id = '00000000-0000-0000-0000-0000000000c1'), 'approved')$$, 'aal2');
select is((select status::text from video_resumes where employee_id = :C), 'approved', 'admin approves a video');
select ok(exists (select 1 from audit_logs where action = 'video.status_changed' and actor_id = :AD), 'video review is audited');

insert into tests (id, title, time_limit_seconds, pass_score) values ('00000000-0000-0000-0000-00000000c002', '[SAMPLE] Draft test', 300, 50);
insert into test_questions (id, test_id, prompt, options, position) values
  ('00000000-0000-0000-0000-00000000d101', '00000000-0000-0000-0000-00000000c002', '[SAMPLE] A', '["x","y"]', 0),
  ('00000000-0000-0000-0000-00000000d102', '00000000-0000-0000-0000-00000000c002', '[SAMPLE] B', '["x","y"]', 1);
select ok(tests.denied_as(:AD, $$select admin_activate_test('00000000-0000-0000-0000-00000000c002')$$, 'aal2'),
  'a test cannot be activated until every question has an answer key');
select tests.run_as(:AD, $$select admin_swap_test_questions('00000000-0000-0000-0000-00000000d101', '00000000-0000-0000-0000-00000000d102')$$, 'aal2');
select is((select position from test_questions where id = '00000000-0000-0000-0000-00000000d101'), 1, 'questions swap positions');
select ok(tests.denied_as(:B, $$select admin_swap_test_questions('00000000-0000-0000-0000-00000000d101', '00000000-0000-0000-0000-00000000d102')$$),
  'employees cannot reorder questions');

-- ---------------------------------------------------------------------------
-- 8. Nobody changes their own role or status
-- ---------------------------------------------------------------------------
select ok(tests.denied_as(:B, $$update profiles set role = 'admin' where id = auth.uid()$$), 'employee cannot change role');
select ok(tests.denied_as(:B, $$update employee_profiles set status = 'approved' where user_id = auth.uid()$$), 'employee cannot approve self');
select ok(tests.denied_as(:E2, $$update employer_profiles set status = 'approved' where user_id = auth.uid()$$), 'employer cannot approve self');
select ok(tests.denied_as(:E1, $$update employer_profiles set company_name = 'Other' where user_id = auth.uid()$$), 'employer cannot rename the company');
select ok(tests.denied_as(:B, $$insert into access_grants (employer_id, employee_id, scopes) values (auth.uid(), auth.uid(), '{profile}')$$), 'nobody inserts grants directly');
select tests.run_as(:E1, 'select complete_password_change()');
select ok(not (select must_change_password from employer_profiles where user_id = :E1), 'employer clears the first-login flag');

-- ---------------------------------------------------------------------------
-- 9. audit_logs is append-only
-- ---------------------------------------------------------------------------
select ok((select count(*) from audit_logs where actor_id = :AD) >= 8, 'admin actions are audited with the admin as actor');
select ok(tests.denied_as(:AD, $$update audit_logs set action = 'x'$$, 'aal2'), 'admin cannot update audit_logs');
select ok(tests.denied_as(:AD, 'delete from audit_logs', 'aal2'), 'admin cannot delete audit_logs');
select throws_ok($$update audit_logs set action = 'x'$$, '42501', 'audit_logs is append-only', 'even the owner cannot update audit_logs');
select throws_ok('delete from audit_logs', '42501', 'audit_logs is append-only', 'even the owner cannot delete audit_logs');

-- ---------------------------------------------------------------------------
-- Structure
-- ---------------------------------------------------------------------------
select is((select string_agg(relname, ', ') from pg_class
            where relnamespace = 'public'::regnamespace and relkind = 'r'
              and not (relrowsecurity and relforcerowsecurity)), null,
  'every public table has RLS enabled and forced');
select is((select count(*)::int from storage.buckets where id in ('cv-documents', 'video-resumes') and public), 0,
  'storage buckets are private');

select * from finish();
rollback;
