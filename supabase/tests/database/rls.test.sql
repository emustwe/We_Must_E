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
delete from public.tests;
delete from public.video_questions;
delete from public.video_question_sets;
delete from public.surveys;
delete from auth.users;

-- An admin (create-admin script: auth user + admin profile).
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000ad', 'admin@test.local');
insert into public.profiles (id, role, full_name) values ('00000000-0000-0000-0000-0000000000ad', 'admin', 'Admin');
-- Employers: role only via app_metadata (service role), at insert or later (invite).
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'e1@test.local',
   '{"wemuste_role":"employer","company_name":"Acme","created_by":"00000000-0000-0000-0000-0000000000ad"}'),
  ('00000000-0000-0000-0000-0000000000e2', 'e2@test.local', '{"wemuste_role":"employer","company_name":"Pending Co"}');
-- Invite path: user first, app_metadata in a later update.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000e3', 'e3@test.local');
update auth.users set raw_app_meta_data = '{"wemuste_role":"employer","company_name":"Invited Co"}'
 where id = '00000000-0000-0000-0000-0000000000e3';
-- Anyone else (e.g. someone calling the signup API directly) gets nothing.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000f1', 'sneaky@test.local', '{"role":"admin","wemuste_role":"employer"}');

\set AD '''00000000-0000-0000-0000-0000000000ad'''
\set E1 '''00000000-0000-0000-0000-0000000000e1'''
\set E2 '''00000000-0000-0000-0000-0000000000e2'''
\set E3 '''00000000-0000-0000-0000-0000000000e3'''
\set F1 '''00000000-0000-0000-0000-0000000000f1'''

-- ---------------------------------------------------------------------------
-- Accounts: only admins and employers exist
-- ---------------------------------------------------------------------------
select is((select role::text from profiles where id = :E1), 'employer', 'app_metadata creates an employer');
select is((select role::text from profiles where id = :E3), 'employer', 'invite path (late app_metadata) creates an employer');
select is((select company_name from employer_profiles where user_id = :E3), 'Invited Co', 'invited employer gets their company details');
select is((select status::text from employer_profiles where user_id = :E1), 'pending', 'new employers start pending');
select ok((select must_change_password from employer_profiles where user_id = :E3), 'invited employers must set a password');
select is((select created_by from employer_profiles where user_id = :E1), :AD::uuid, 'created_by is recorded for admins');
select is((select count(*)::int from profiles where id = :F1), 0, 'user_metadata cannot create any profile (no job-seeker or admin by signup)');
select throws_ok($$insert into profiles (id, role) values ('00000000-0000-0000-0000-0000000000f1', 'employee')$$,
  '23514', null, 'the job-seeker role can no longer exist');
select is((select count(*)::int from information_schema.tables where table_schema = 'public'
            and table_name in ('employee_profiles', 'employee_contacts', 'job_applications', 'access_grants',
                               'meeting_requests', 'test_attempts', 'video_resumes', 'cv_documents')), 0,
  'job-seeker account tables are gone');

-- Admin approval needs MFA.
select ok(tests.denied_as(:AD, format('select admin_set_employer_status(%L, ''approved'')', :E1)),
  'admin without MFA cannot approve employers');
select tests.run_as(:AD, format('select admin_set_employer_status(%L, ''approved'')', :E1), 'aal2');
select is((select approved_by from employer_profiles where user_id = :E1), :AD::uuid, 'approval records the admin');
select is(tests.rows_as(:AD, 'select 1 from employer_profiles'), 0, 'admin without MFA reads no employers');
select is(tests.rows_as(:AD, 'select 1 from employer_profiles', 'aal2'), 3, 'MFA admin reads all employers');

-- ---------------------------------------------------------------------------
-- Anonymous users and employers
-- ---------------------------------------------------------------------------
select is(tests.rows_as(null, 'select 1 from profiles'), -1, 'anon: profiles refused');
select is(tests.rows_as(null, 'select 1 from employer_profiles'), -1, 'anon: employer_profiles refused');
select is(tests.rows_as(null, 'select 1 from jobs'), -1, 'anon: jobs refused');
select is((select count(*)::int from information_schema.role_table_grants
            where grantee = 'anon' and table_schema = 'public'), 0, 'anon has no table privileges');
select is(tests.rows_as(:E1, 'select 1 from employer_profiles'), 1, 'employer reads only their own employer profile');
select is(tests.rows_as(:E1, 'select 1 from profiles'), 1, 'employer reads only their own profile');
select is(tests.rows_as(:E1, 'select 1 from surveys'), 0, 'employers cannot read question content');
select is(tests.rows_as(:E1, 'select 1 from test_answer_keys'), -1, 'employers cannot read answer keys');
select is(tests.rows_as(:AD, 'select 1 from test_answer_keys', 'aal2'), -1, 'nobody reads answer keys directly, not even admins');

-- ---------------------------------------------------------------------------
-- Nobody changes their own role or status
-- ---------------------------------------------------------------------------
select ok(tests.denied_as(:E1, $$update profiles set role = 'admin' where id = auth.uid()$$), 'employer cannot change role');
select ok(tests.denied_as(:E2, $$update employer_profiles set status = 'approved' where user_id = auth.uid()$$), 'employer cannot approve self');
select ok(tests.denied_as(:E1, $$update employer_profiles set company_name = 'Other' where user_id = auth.uid()$$), 'employer cannot rename the company');
select tests.run_as(:E3, 'select complete_password_change()');
select ok(not (select must_change_password from employer_profiles where user_id = :E3), 'invited employer clears the first-login flag');

-- Account deletion: employers only, audited without personal data.
select ok(tests.denied_as(:AD, 'select record_account_deletion()', 'aal2'), 'admins cannot self-delete');
select tests.run_as(:E2, 'select record_account_deletion()');
select is((select metadata::text from audit_logs where action = 'account.deleted' and target_id = :E2), '{"role": "employer"}',
  'deletion leaves a pseudonymous audit entry');

-- ---------------------------------------------------------------------------
-- Jobs: employers post 3 fields; the public only sees get_public_jobs()
-- ---------------------------------------------------------------------------
select tests.run_as(:AD, format('select admin_set_employer_status(%L, ''approved'')', :E3), 'aal2');
select tests.run_as(:E1, $$insert into jobs (employer_id, title, description, location_label, lat, lng)
  values (auth.uid(), 'Weekend barista', 'Make coffee for our customers.', 'Dubai Marina, Dubai', 25.080512, 55.140311)$$);
select tests.run_as(:E1, $$insert into jobs (employer_id, title, description, location_label, lat, lng)
  values (auth.uid(), 'Flyer helper', 'Hand out flyers at the mall.', 'Al Nahda, Sharjah', 25.30, 55.37)$$);
\set JA '(select id from jobs where title = ''Weekend barista'')'
\set JB '(select id from jobs where title = ''Flyer helper'')'

select is((select status::text from jobs where id = :JA), 'published', 'a new job is live immediately');
select ok((select abs(public_lat - lat) <= 0.00136 and abs(public_lng - lng) <= 0.0016
             and (public_lat, public_lng) <> (lat, lng) from jobs where id = :JA),
  'the public pin is rounded to about 300 m');
select ok(tests.denied_as(:E2, $$insert into jobs (employer_id, title, description, location_label, lat, lng)
  values (auth.uid(), 'Nope', 'Pending employers cannot post.', 'Dubai', 25.2, 55.3)$$), 'pending employer cannot post');
select ok(tests.denied_as(:E1, format($$insert into jobs (employer_id, title, description, location_label, lat, lng)
  values (%L, 'Spoof', 'Posting for someone else.', 'Dubai', 25.2, 55.3)$$, :E3)), 'employer cannot post for another employer');
select ok(tests.denied_as(:E1, $$insert into jobs (employer_id, title, description, location_label, lat, lng, status)
  values (auth.uid(), 'Hidden', 'Choosing the status is not allowed.', 'Dubai', 25.2, 55.3, 'hidden')$$), 'employer cannot choose the status');
select ok(tests.denied_as(:E1, format('update jobs set public_lat = lat where id = %s', :'JA')), 'employer cannot set the public pin');

-- Anonymous visitors: only the RPC, and it never exposes the exact point or the employer.
select is(tests.rows_as(null, 'select * from get_public_jobs(22.5, 51, 26.5, 56.6)'), 2, 'anon sees published jobs through get_public_jobs');
select is((select array_agg(a order by a) from unnest((select proargnames from pg_proc where proname = 'get_public_jobs')) a
            where a in ('lat', 'lng', 'employer_id', 'test_id', 'survey_id')), null,
  'get_public_jobs returns no exact coordinates or employer id');
select is(tests.rows_as(null, 'select * from get_public_jobs(24, 54, 24.1, 54.1)'), 0, 'get_public_jobs is limited to the bounding box');
select ok(tests.denied_as(null, format('select admin_set_job_status(%s, ''hidden'')', :'JA')), 'anon cannot moderate jobs');

-- Employers only touch their own jobs, and may only close them.
select is(tests.rows_as(:E3, 'select 1 from jobs'), 0, 'employer cannot read another employer''s jobs');
select ok(tests.denied_as(:E3, format('update jobs set title = ''Hacked'' where id = %s', :'JA')), 'employer cannot edit another employer''s job');
select ok(tests.denied_as(:E1, format('update jobs set status = ''hidden'' where id = %s', :'JA')), 'employer cannot hide a job');
select ok(tests.denied_as(:E1, format('update jobs set status = ''removed'' where id = %s', :'JA')), 'employer cannot remove a job');
select tests.run_as(:E1, format('update jobs set title = ''Weekend barista'', location_label = ''JBR, Dubai'' where id = %s', :'JA'));
select is((select location_label from jobs where id = :JA), 'JBR, Dubai', 'employer edits their own job');
select tests.run_as(:E1, format('update jobs set status = ''closed'' where id = %s', :'JB'));
select ok((select closed_at is not null from jobs where id = :JB), 'employer closes their own job');
select ok(tests.denied_as(:E1, format('update jobs set status = ''published'' where id = %s', :'JB')), 'employer cannot re-open a closed job');
select is(tests.rows_as(null, 'select * from get_public_jobs(22.5, 51, 26.5, 56.6)'), 1, 'closed jobs leave the public map');

-- Admin moderation: MFA only, audited.
select ok(tests.denied_as(:AD, format('select admin_set_job_status(%s, ''hidden'')', :'JA')), 'admin without MFA cannot moderate');
select ok(tests.denied_as(:E1, format('select admin_set_job_status(%s, ''published'')', :'JB')), 'employers cannot use admin moderation');
select tests.run_as(:AD, format('select admin_set_job_status(%s, ''hidden'')', :'JA'), 'aal2');
select is(tests.rows_as(null, 'select * from get_public_jobs(22.5, 51, 26.5, 56.6)'), 0, 'hidden jobs leave the public map');
select ok(tests.denied_as(:E1, format('update jobs set title = ''Back'' where id = %s', :'JA')), 'employer cannot edit a hidden job');
select is((select metadata::text from audit_logs where action = 'job.status_changed' and target_id = :JA),
  '{"to": "hidden", "from": "published"}', 'moderation is audited with the change');
select tests.run_as(:AD, format('select admin_set_job_status(%s, ''published'')', :'JA'), 'aal2');
select is(tests.rows_as(:AD, 'select 1 from jobs', 'aal2'), 2, 'MFA admin reads all jobs');
select is(tests.rows_as(:AD, 'select 1 from jobs'), 0, 'admin without MFA reads no jobs');

-- A suspended employer's jobs disappear from the map, and they lose access.
select tests.run_as(:AD, format('select admin_set_employer_status(%L, ''suspended'')', :E1), 'aal2');
select is(tests.rows_as(null, 'select * from get_public_jobs(22.5, 51, 26.5, 56.6)'), 0, 'suspended employer''s jobs are hidden');
select is(tests.rows_as(:E1, 'select 1 from jobs'), 0, 'suspended employer cannot read their jobs');
select ok(tests.denied_as(:E1, $$insert into jobs (employer_id, title, description, location_label, lat, lng)
  values (auth.uid(), 'Again', 'Suspended employers cannot post.', 'Dubai', 25.2, 55.3)$$), 'suspended employer cannot post');

-- ---------------------------------------------------------------------------
-- Public applications: only the server (service role) with the right token
-- ---------------------------------------------------------------------------
insert into tests (id, title, time_limit_seconds, pass_score, is_active)
  values ('30000000-0000-0000-0000-000000000001', 'Test', 60, 50, true);
insert into test_questions (id, test_id, type, prompt, options, position, points) values
  ('30000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-000000000001', 'single_choice', 'Q1', '["a","b"]', 0, 1),
  ('30000000-0000-0000-0000-0000000000a2', '30000000-0000-0000-0000-000000000001', 'multi_choice', 'Q2', '["a","b","c"]', 1, 2),
  ('30000000-0000-0000-0000-0000000000a3', '30000000-0000-0000-0000-000000000001', 'long_text', 'Q3', '[]', 2, 1);
insert into test_answer_keys (question_id, correct_options) values
  ('30000000-0000-0000-0000-0000000000a1', '{1}'), ('30000000-0000-0000-0000-0000000000a2', '{0,2}');
insert into video_question_sets (id, title, is_active) values ('30000000-0000-0000-0000-000000000002', 'Videos', true);
insert into video_questions (id, set_id, prompt, max_seconds, position)
  values ('30000000-0000-0000-0000-0000000000b1', '30000000-0000-0000-0000-000000000002', 'Say hi', 30, 0);
insert into surveys (id, title, is_active) values ('30000000-0000-0000-0000-000000000003', 'Survey', true);
insert into survey_questions (id, survey_id, type, prompt, options, required, position)
  values ('30000000-0000-0000-0000-0000000000c1', '30000000-0000-0000-0000-000000000003', 'single_choice', 'Start?', '["now","later"]', true, 0);
select tests.run_as(:E3, $$insert into jobs (employer_id, title, description, location_label, lat, lng)
  values (auth.uid(), 'Apply here', 'A job open for applications.', 'Deira, Dubai', 25.27, 55.31),
         (auth.uid(), 'Other job', 'Another open job for applications.', 'Karama, Dubai', 25.24, 55.30)$$);
\set JC '(select id from jobs where title = ''Apply here'')'
\set JD '(select id from jobs where title = ''Other job'')'
\set TOKA '''token-a-0123456789-0123456789-0123456789'''
\set TOKB '''token-b-0123456789-0123456789-0123456789'''
\set VQ '''30000000-0000-0000-0000-0000000000b1'''
\set SQ '''30000000-0000-0000-0000-0000000000c1'''

select is((select video_set_id from jobs where id = :JC), '30000000-0000-0000-0000-000000000002'::uuid,
  'new jobs use the active video question set');
select ok(not has_function_privilege('anon', 'public.app_start(uuid, text, text)', 'execute')
      and not has_function_privilege('authenticated', 'public.app_submit(uuid, text, text, text, text, jsonb, text, text, boolean)', 'execute')
      and not has_function_privilege('authenticated', 'public.app_save_test_answer(uuid, text, uuid, jsonb)', 'execute')
      and has_function_privilege('service_role', 'public.app_start(uuid, text, text)', 'execute'),
  'application functions are for the server (service role) only');
select ok(tests.denied_as(null, format('insert into applications (job_id) values (%s)', :'JC')), 'anon cannot create applications directly');
select ok(tests.denied_as(:E3, format('insert into applications (job_id) values (%s)', :'JC')), 'employers cannot create applications');
select throws_ok(format('select app_start(%s, %s, null)', :'JB', :'TOKA'), 'P0002', 'job_unavailable', 'a closed job takes no applications');

select lives_ok(format('select app_start(%s, %s, ''iphash'')', :'JC', :'TOKA'), 'the server starts an application for a live job');
\set AA '(select id from applications where draft_token_hash = ' :TOKA ')'
select is((select current_step::text from applications where id = :AA), 'test', 'a new application starts at the test');
select is((select test_id from applications where id = :AA), '30000000-0000-0000-0000-000000000001'::uuid, 'the application keeps the job''s question sets');

-- Required test 2: a token only opens its own application.
select throws_ok(format('select app_start_test(%s, %s)', :'JD', :'TOKA'), '28000', 'invalid_token', 'a token for job A cannot open an application for job B');
select throws_ok(format('select app_start_test(%s, ''wrong-token-0123456789-0123456789'')', :'JC'), '28000', 'invalid_token', 'a wrong token opens nothing');

select throws_ok(format($$select app_save_test_answer(%s, %s, '30000000-0000-0000-0000-0000000000a1', '{"options":[1]}')$$, :'JC', :'TOKA'),
  '22023', 'wrong_step', 'answers are refused before the test starts');
select ok((select app_start_test(:JC, :TOKA)) > now(), 'starting the test returns a future deadline');
select lives_ok(format($$select app_save_test_answer(%s, %s, '30000000-0000-0000-0000-0000000000a1', '{"options":[1]}')$$, :'JC', :'TOKA'), 'a choice answer is saved');
select lives_ok(format($$select app_save_test_answer(%s, %s, '30000000-0000-0000-0000-0000000000a2', '{"options":[2,0]}')$$, :'JC', :'TOKA'), 'a multi-choice answer is saved');
select lives_ok(format($$select app_save_test_answer(%s, %s, '30000000-0000-0000-0000-0000000000a3', '{"text":"I like people"}')$$, :'JC', :'TOKA'), 'a written answer is saved');
select throws_ok(format($$select app_save_test_answer(%s, %s, '30000000-0000-0000-0000-0000000000a1', '{"options":[0,1]}')$$, :'JC', :'TOKA'),
  '22023', 'invalid_answer', 'two options for a single-choice question are refused');
select throws_ok(format($$select app_save_test_answer(%s, %s, '30000000-0000-0000-0000-0000000000a1', '{"options":[7]}')$$, :'JC', :'TOKA'),
  '22023', 'invalid_answer', 'an option that does not exist is refused');
select throws_ok(format($$select app_save_test_answer(%s, %s, '30000000-0000-0000-0000-0000000000a3', '{"options":[0]}')$$, :'JC', :'TOKA'),
  '22023', 'invalid_answer', 'a choice answer to a written question is refused');

-- Required test 6: late answers are rejected.
update applications set test_started_at = now() - interval '2 minutes' where id = :AA;
select throws_ok(format($$select app_save_test_answer(%s, %s, '30000000-0000-0000-0000-0000000000a1', '{"options":[0]}')$$, :'JC', :'TOKA'),
  '22023', 'time_expired', 'answers after the time limit are rejected');
select lives_ok(format('select app_submit_test(%s, %s)', :'JC', :'TOKA'), 'the test can still be finished after the time limit');
select is((select (test_score, test_max_score)::text from applications where id = :AA), '(3.00,4.00)',
  'choice questions are graded on the server (written ones wait for the admin)');
select is((select is_correct from application_test_answers where application_id = :AA
            and question_id = '30000000-0000-0000-0000-0000000000a1'), true, 'the late answer did not replace the saved one');
select is((select current_step::text from applications where id = :AA), 'video', 'after the test comes the video');

select throws_ok(format('select app_record_video(%s, %s, %s, ''someone-else/x.webm'', 10, 1000, ''video/webm'')', :'JC', :'TOKA', :'VQ'),
  '22023', 'invalid_video', 'a video path outside the application folder is refused');
select throws_ok(format('select app_finish_videos(%s, %s)', :'JC', :'TOKA'), '22023', 'incomplete', 'every video question needs an answer');
select lives_ok(format('select app_record_video(%s, %s, %s, %L, 12, 2000, ''video/webm'')', :'JC', :'TOKA', :'VQ',
  (select id from applications where draft_token_hash = :TOKA) || '/' || :VQ || '/one.webm'), 'a video answer is recorded');
select lives_ok(format('select app_finish_videos(%s, %s)', :'JC', :'TOKA'), 'the videos are done');

select throws_ok(format($$select app_submit(%s, %s, 'Sara Ali', '+971501234567', '', '{}', 'v1', 'ip', true)$$, :'JC', :'TOKA'),
  '22023', 'incomplete', 'required survey questions must be answered');
select throws_ok(format($$select app_submit(%s, %s, 'Sara Ali', '+971501234567', '', '{"30000000-0000-0000-0000-0000000000ff":{"text":"x"}}', 'v1', 'ip', true)$$, :'JC', :'TOKA'),
  '22023', 'invalid_answer', 'answers to unknown questions are refused');
select throws_ok(format($$select app_submit(%s, %s, 'Sara Ali', '+971501234567', '', %L, 'v1', 'ip', true)$$, :'JC', :'TOKA',
  jsonb_build_object(:SQ, '{"text":"now"}'::jsonb)), '22023', 'invalid_answer', 'a survey answer of the wrong shape is refused');
select throws_ok(format($$select app_submit(%s, %s, 'Sara Ali', '+971501234567', '', %L, 'v1', 'ip', false)$$, :'JC', :'TOKA',
  jsonb_build_object(:SQ, '{"options":[0]}'::jsonb)), '22023', 'phone_unverified', 'an unconfirmed phone is refused when codes are required');
select lives_ok(format($$select app_submit(%s, %s, 'Sara Ali', '+971501234567', 'Sara@Example.com', %L, 'v1', 'ip', true)$$, :'JC', :'TOKA',
  jsonb_build_object(:SQ, '{"options":[0]}'::jsonb)), 'the application is submitted');
\set AA '(select a.id from applications a join jobs j on j.id = a.job_id where j.title = ''Apply here'')'
select is((select (status, current_step, draft_token_hash is null)::text from applications where id = :AA),
  '(submitted,submitted,t)', 'submitting ends the draft: status submitted, token cleared');
select is((select count(*)::int from consents where application_id = :AA), 1, 'the consent is recorded');
select is((select email from applicants where phone_e164 = '+971501234567'), 'sara@example.com', 'the applicant is stored by phone number');
select throws_ok(format('select app_start_test(%s, %s)', :'JC', :'TOKA'), '28000', 'invalid_token', 'the token stops working after submitting');

-- A second application from the same phone links to the same person.
select app_start(:JD, :TOKB, 'ip');
update applications set current_step = 'survey' where draft_token_hash = :TOKB;
select app_submit(:JD, :TOKB, 'Sara A.', '+971501234567', '', jsonb_build_object(:SQ, '{"options":[1]}'::jsonb), 'v1', 'ip', true);
select is((select count(*)::int from applicants), 1, 'repeat applicants are matched by phone number');
select is((select count(distinct applicant_id)::int from applications where status = 'submitted'), 1, 'both applications belong to the same applicant');

-- Reads: nobody but MFA admins (employers get approved ones in phase 6).
select is(tests.rows_as(null, 'select 1 from applications'), -1, 'anon cannot read applications');
select is(tests.rows_as(:E3, 'select 1 from applications'), 0, 'employers cannot see unreviewed applications, even for their own jobs');
select is(tests.rows_as(:E3, 'select 1 from applicants'), 0, 'employers cannot see applicants');
select is(tests.rows_as(:AD, 'select 1 from applications'), 0, 'admin without MFA reads no applications');
select is(tests.rows_as(:AD, 'select 1 from applications', 'aal2'), 2, 'MFA admin reads applications');
select is(tests.rows_as(:AD, 'select 1 from phone_verifications', 'aal2'), -1, 'phone codes are unreadable, even for admins');
select ok(tests.denied_as(:AD, format('update applications set status = ''approved'' where id = %s', :'AA'), 'aal2'),
  'applications are not edited directly (review goes through audited functions)');

-- Storage: the bucket is private.
insert into storage.objects (bucket_id, name) values ('application-videos', 'demo/one.webm');
select is((select public from storage.buckets where id = 'application-videos'), false, 'the video bucket is private');
select ok(tests.rows_as(null, $$select 1 from storage.objects where bucket_id = 'application-videos'$$) <= 0, 'anon cannot read videos');
select is(tests.rows_as(:E3, $$select 1 from storage.objects where bucket_id = 'application-videos'$$), 0, 'employers cannot read unapproved videos');
select is(tests.rows_as(:AD, $$select 1 from storage.objects where bucket_id = 'application-videos'$$, 'aal2'), 1, 'MFA admins can read videos');
select ok(tests.denied_as(null, $$insert into storage.objects (bucket_id, name) values ('application-videos', 'x/y.webm')$$),
  'nobody uploads without a server-signed upload URL');

-- Cleanup: unfinished applications older than 48 h, never submitted ones.
select app_start(:JD, 'token-c-0123456789-0123456789-0123456789', 'ip');
update applications set created_at = now() - interval '49 hours' where status = 'in_progress';
update applications set created_at = now() - interval '72 hours' where id = :AA;
select is((select count(distinct application_id)::int from app_cleanup_candidates(48)), 1, 'only unfinished applications are cleaned up');
select is(app_cleanup(array(select application_id from app_cleanup_candidates(48))), 1, 'the unfinished application is deleted');
select is((select count(*)::int from applications), 2, 'submitted applications are kept');

-- ---------------------------------------------------------------------------
-- audit_logs is append-only
-- ---------------------------------------------------------------------------
select ok((select count(*) from audit_logs where actor_id = :AD) >= 1, 'admin actions are audited with the admin as actor');
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

select * from finish();
rollback;
