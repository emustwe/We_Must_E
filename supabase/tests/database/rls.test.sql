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
select ok(tests.denied_as(:E3, 'select complete_password_change()'), 'sponsors cannot skip the first-login password change');
select ok(tests.denied_as(:E3, format('select admin_revoke_sessions(%L)', :E1)), 'sponsors cannot end other people''s sessions');
select ok(tests.denied_as(:AD, format('select admin_revoke_sessions(%L)', :E3), 'aal2'), 'ending sessions is for the server only');
update employer_profiles set must_change_password = false where user_id = :E3;

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

select is((select status::text from jobs where id = :JA), 'pending', 'a new job waits for admin review');
select is(tests.rows_as(null, 'select * from get_public_jobs(-90, -180, 90, 180)'), 0, 'jobs waiting for review are not on the public map');
select ok(tests.denied_as(:E1, format('update jobs set status = ''published'' where id = %s', :'JA')), 'sponsors cannot publish their own job');
select ok(tests.denied_as(:AD, format('select admin_review_job(%s, true, '''')', :'JA')), 'admin without MFA cannot approve jobs');
select ok(tests.denied_as(:E1, format('select admin_review_job(%s, true, '''')', :'JA'), 'aal2'), 'sponsors cannot approve jobs');
select tests.run_as(:AD, format('select admin_review_job(%s, false, ''Please add the hours'')', :'JB'), 'aal2');
select is((select status::text || '|' || review_note from jobs where id = :JB), 'rejected|Please add the hours',
  'a rejected job keeps the reason for the sponsor');
select tests.run_as(:E1, format('update jobs set description = ''Hand out flyers at the mall, 4-8pm.'' where id = %s', :'JB'));
select is((select status::text || '|' || coalesce(review_note, '-') from jobs where id = :JB), 'pending|-',
  'editing a rejected job sends it back for review');
select tests.run_as(:AD, format('select admin_review_job(%s, true, '''')', :'JA'), 'aal2');
select tests.run_as(:AD, format('select admin_review_job(%s, true, '''')', :'JB'), 'aal2');
select is((select count(*)::int from jobs where status = 'published' and published_at is not null and reviewed_by = :AD::uuid), 2,
  'approved jobs go live, with the reviewer recorded');
select ok(exists (select 1 from audit_logs where action = 'job.approved') and exists (select 1 from audit_logs where action = 'job.rejected'),
  'job approvals and rejections are audited');
select tests.run_as(:E1, format('update jobs set description = ''Make coffee for our customers, weekends.'' where id = %s', :'JA'));
select is((select status::text from jobs where id = :JA), 'pending', 'editing a live job sends it back for review');
select tests.run_as(:AD, format('select admin_review_job(%s, true, '''')', :'JA'), 'aal2');
select ok((select abs(public_lat - lat) <= 0.00136 and abs(public_lng - lng) <= 0.0016
             and (public_lat, public_lng) <> (lat, lng) from jobs where id = :JA),
  'the public pin is rounded to about 300 m');
-- Two points in the same ~300 m cell get the very same pin: the pin can't be
-- worked back to the exact latitude.
insert into jobs (id, employer_id, title, description, location_label, lat, lng) values
  ('40000000-0000-0000-0000-0000000000a1', :E1, 'Pin A', 'Checking the public pin grid.', 'Dubai', 25.0800, 55.1403),
  ('40000000-0000-0000-0000-0000000000a2', :E1, 'Pin B', 'Checking the public pin grid.', 'Dubai', 25.0812, 55.1403);
select is((select count(distinct (public_lat, public_lng))::int from jobs where title in ('Pin A', 'Pin B')), 1,
  'points in the same cell share one public pin');
delete from jobs where title in ('Pin A', 'Pin B');
-- Every content change to a live job goes back to review (not only some fields).
select tests.run_as(:E1, format('update jobs set country_name = ''Call +971500000000'' where id = %s', :'JA'));
select is((select status::text from jobs where id = :JA), 'pending', 'any change to a live job sends it back for review');
select tests.run_as(:AD, format('select admin_review_job(%s, true, '''')', :'JA'), 'aal2');
select throws_ok(format('select tests.run_as(%L, %L)', :E1,
  $$insert into jobs (employer_id, title, description, location_label, lat, lng)
    select auth.uid(), 'Flood ' || n, 'Too many jobs in one day.', 'Dubai', 25.2, 55.3 from generate_series(1, 25) n$$),
  '54000', 'rate_limited', 'a sponsor posts at most 20 jobs a day');
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
select tests.run_as(:AD, format('select admin_review_job(%s, true, '''')', :'JA'), 'aal2');
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
  ('30000000-0000-0000-0000-0000000000a3', '30000000-0000-0000-0000-000000000001', 'long_text', 'Q3', '[]', 2, 1),
  ('30000000-0000-0000-0000-0000000000a4', '30000000-0000-0000-0000-000000000001', 'typing', 'Type this', '["Hello team"]', 3, 1);
insert into test_answer_keys (question_id, correct_options) values
  ('30000000-0000-0000-0000-0000000000a1', '{1}'), ('30000000-0000-0000-0000-0000000000a2', '{0,2}');
insert into video_question_sets (id, title, is_active) values ('30000000-0000-0000-0000-000000000002', 'Videos', true);
insert into video_questions (id, set_id, prompt, max_seconds, position)
  values ('30000000-0000-0000-0000-0000000000b1', '30000000-0000-0000-0000-000000000002', 'Say hi', 30, 0),
         ('30000000-0000-0000-0000-0000000000b2', '30000000-0000-0000-0000-000000000002', 'Why this job?', 40, 1);
insert into surveys (id, title, is_active) values ('30000000-0000-0000-0000-000000000003', 'Survey', true);
insert into survey_questions (id, survey_id, type, prompt, options, required, position)
  values ('30000000-0000-0000-0000-0000000000c1', '30000000-0000-0000-0000-000000000003', 'single_choice', 'Start?', '["now","later"]', true, 0);
select tests.run_as(:E3, $$insert into jobs (employer_id, title, description, location_label, lat, lng)
  values (auth.uid(), 'Apply here', 'A job open for applications.', 'Deira, Dubai', 25.27, 55.31),
         (auth.uid(), 'Other job', 'Another open job for applications.', 'Karama, Dubai', 25.24, 55.30)$$);
update jobs set status = 'published' where title in ('Apply here', 'Other job');
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
select lives_ok(format($$select app_save_test_answer(%s, %s, '30000000-0000-0000-0000-0000000000a4', '{"text":"Hello team","stats":{"seconds":40,"backspaces":3,"keystrokes":55}}')$$, :'JC', :'TOKA'), 'a typing answer with its stats is saved');
select throws_ok(format($$select app_save_test_answer(%s, %s, '30000000-0000-0000-0000-0000000000a4', '{"text":"x","stats":{"score":100}}')$$, :'JC', :'TOKA'),
  '22023', 'invalid_answer', 'unknown typing stats are refused');
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
select is((select (test_score, test_max_score)::text from applications where id = :AA), '(,)',
  'answers are not scored (there are no right or wrong answers)');
select is((select answer ->> 'options' from application_test_answers where application_id = :AA
            and question_id = '30000000-0000-0000-0000-0000000000a1'), '[1]', 'the late answer did not replace the saved one');
select is((select current_step::text from applications where id = :AA), 'video', 'after the test comes the video');
select is((select jsonb_array_length(private.video_prompts(:AA))), 4, 'the video page asks about the test''s questions');

-- Task: one video per video question, plus the contact details.
\set APP '(select id from applications where draft_token_hash = ' :TOKA ')'
select throws_ok(format('select app_record_question_video(%s, %s, %s, ''someone-else/x.webm'', 10, 1000, ''video/webm'')', :'JC', :'TOKA', :'VQ'),
  '22023', 'invalid_video', 'a video path outside the question folder is refused');
select throws_ok(format('select app_record_question_video(%s, %s, %s, %L, 40, 2000, ''video/webm'')', :'JC', :'TOKA', :'VQ',
  (select id from applications where draft_token_hash = :TOKA) || '/30000000-0000-0000-0000-0000000000b1/long.webm'),
  '22023', 'invalid_video', 'a video longer than its question allows is refused');
select lives_ok(format('select app_record_question_video(%s, %s, %s, %L, 12, 2000, ''video/webm'')', :'JC', :'TOKA', :'VQ',
  (select id from applications where draft_token_hash = :TOKA) || '/30000000-0000-0000-0000-0000000000b1/one.webm'), 'a question''s video is recorded');
select is(app_record_question_video(:JC, :TOKA, :VQ,
  (select id from applications where draft_token_hash = :TOKA) || '/30000000-0000-0000-0000-0000000000b1/two.webm', 20, 2000, 'video/webm'),
  (select id from applications where draft_token_hash = :TOKA) || '/30000000-0000-0000-0000-0000000000b1/one.webm',
  'recording a question again replaces its video (the old file is returned)');
select throws_ok(format($$select app_save_profile(%s, %s, '{"fullName":"Sara Ali","phone":"12"}')$$, :'JC', :'TOKA'),
  '22023', 'invalid_input', 'the profile needs a valid phone number');
select lives_ok(format($$select app_save_profile(%s, %s, '{"fullName":"Sara Ali","phone":"+971501234567","age":"29"}')$$, :'JC', :'TOKA'),
  'the Task profile is saved');
select throws_ok(format('select app_finish_videos(%s, %s)', :'JC', :'TOKA'), '22023', 'incomplete', 'every video question needs its video');
select lives_ok(format('select app_record_question_video(%s, %s, ''30000000-0000-0000-0000-0000000000b2'', %L, 30, 2000, ''video/webm'')', :'JC', :'TOKA',
  (select id from applications where draft_token_hash = :TOKA) || '/30000000-0000-0000-0000-0000000000b2/a.webm'), 'the second question''s video is recorded');
select throws_ok(format('select app_record_cv(%s, %s, ''other-app/cv/x.pdf'')', :'JC', :'TOKA'), '22023', 'invalid_input', 'a CV path outside the application is refused');
select lives_ok(format('select app_record_cv(%s, %s, %L)', :'JC', :'TOKA',
  (select id from applications where draft_token_hash = :TOKA) || '/cv/cv.pdf'), 'the CV is recorded');
select is((select count(*)::int from application_videos where application_id = :AA), 2, 'one video per question');
select ok((select task_started_at is not null from applications where id = :AA), 'the Task clock started');
select lives_ok(format('select app_finish_videos(%s, %s)', :'JC', :'TOKA'), 'the video completes the video step');
select ok((select survey_started_at is not null from applications where id = :AA), 'the Survey clock started');

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
select is((select full_name || '|' || email from applicants where phone_e164 = '+971501234567'), 'Sara Ali|sara@example.com',
  'a later application (the phone is not verified) never changes the stored name or email');
select is((select string_agg(contact_name || ':' || coalesce(contact_email, '-'), ',' order by contact_name desc) from applications
            where status = 'submitted'), 'Sara Ali:sara@example.com,Sara A.:-', 'each application keeps the details given with it');

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
select is(tests.rows_as(:AD, $$select 1 from storage.objects where bucket_id = 'application-videos' and name like 'demo/%'$$, 'aal2'), 1, 'MFA admins can read videos');
select ok(tests.denied_as(null, $$insert into storage.objects (bucket_id, name) values ('application-videos', 'x/y.webm')$$),
  'nobody uploads without a server-signed upload URL');

-- ---------------------------------------------------------------------------
-- Sponsors: public map details, logos, audited changes
-- ---------------------------------------------------------------------------
select tests.run_as(:E3, format('update jobs set country_code = ''AE'', country_name = ''United Arab Emirates'', city = ''Dubai'' where id = %s', :'JC'));
select is((select city from jobs where id = :JC), 'Dubai', 'sponsors set the country and city of their job');
select tests.run_as(:AD, format('select admin_review_job(%s, true, '''')', :'JC'), 'aal2');
select ok(tests.denied_as(:E3, format('update jobs set country_code = ''uae'' where id = %s', :'JC')), 'country codes must be two capital letters');
select is((select sponsor_name || '|' || city || '|' || country_code from get_public_jobs(-90, -180, 90, 180) where id = :JC),
  'Invited Co|Dubai|AE', 'the public map shows the sponsor name, city and country');
select is((select array_agg(a order by a) from unnest((select proargnames from pg_proc where proname = 'get_public_jobs')) a
            where a in ('lat', 'lng', 'employer_id', 'user_id', 'contact_email', 'contact_phone')), null,
  'the public map still never returns exact points, ids or contact details');
select is((select public from storage.buckets where id = 'sponsor-logos'), true, 'logos are public images');
select ok(tests.denied_as(:E3, $$insert into storage.objects (bucket_id, name) values ('sponsor-logos', 'x/logo.png')$$),
  'nobody uploads logos directly (the server checks the file first)');
select ok(tests.denied_as(:E3, format('update employer_profiles set logo_path = ''x.png'' where user_id = %L', :E3)),
  'sponsors cannot change their profile directly');
select tests.run_as(:E3, format('select log_sponsor_change(%L, ''logo'')', :E3));
select ok(exists (select 1 from audit_logs where action = 'sponsor.logo' and actor_id = :E3::uuid), 'a sponsor''s logo change is logged');
select ok(tests.denied_as(:E3, format('select log_sponsor_change(%L, ''password'')', :E3)), 'sponsors cannot use the admin password change');
select ok(tests.denied_as(:E3, format('select log_sponsor_change(%L, ''logo'')', :E2)), 'sponsors cannot change another sponsor''s logo');
select ok(tests.denied_as(:AD, format('select log_sponsor_change(%L, ''deleted'')', :E3)), 'admin without MFA cannot delete sponsors');
select tests.run_as(:AD, format('select log_sponsor_change(%L, ''password'')', :E3), 'aal2');
select ok(exists (select 1 from audit_logs where action = 'sponsor.password' and target_id = :E3::uuid), 'admin password changes are logged');

-- Sponsors see approved candidates only (required tests 3, 8, 9) ----------------------
select is(tests.rows_as(:E3, format('select * from sponsor_list_candidates(%s)', :'JC')), 0, 'before approval the sponsor sees no candidates');
select id as aa_id from applications a where a.job_id = (select id from jobs where title = 'Apply here') \gset
select ok(tests.denied_as(:E3, format('select sponsor_get_candidate(%L)', :'aa_id')), 'an unapproved application cannot be opened by the sponsor');
select is(tests.rows_as(:E3, 'select 1 from application_videos'), 0, 'the sponsor sees no videos before approval');

-- Admin review (required test 7: admin writes fail without MFA).
select ok(tests.denied_as(:AD, format('select admin_review_application(%s, ''approved'', ''ok'')', :'AA')),
  'admin without MFA cannot approve an application');
select ok(tests.denied_as(:E3, format('select admin_review_application(%s, ''approved'', ''ok'')', :'AA'), 'aal2'),
  'employers cannot approve applications');
select tests.run_as(:AD, format('select admin_review_application(%s, ''approved'', ''Great fit'')', :'AA'), 'aal2');
select is((select (status, admin_notes, reviewed_by)::text from applications where id = :AA),
  '(approved,"Great fit",00000000-0000-0000-0000-0000000000ad)', 'approval records the decision, notes and reviewer');
select is((select metadata::text from audit_logs where action = 'application.reviewed' and target_id = :AA),
  '{"to": "approved", "from": "submitted"}', 'the review is audited without personal data');
select ok(tests.denied_as(:AD, format('select admin_review_application(%s, ''in_progress'', '''')', :'AA'), 'aal2'),
  'an application cannot be sent back to in progress');
select id as video_id from application_videos where application_id = :AA limit 1 \gset

-- Every video view is logged; only MFA admins may log (and so view).
select ok(tests.denied_as(:AD, format('select log_video_view(%L)', :'video_id')), 'video views need MFA');
select tests.run_as(:AD, format('select log_video_view(%L)', :'video_id'), 'aal2');
select ok(exists (select 1 from audit_logs where action = 'application.video_viewed' and target_id = :AA
                   and actor_id = :AD::uuid), 'opening a video is logged with the admin as actor');

-- Content: video sets; tests go live without answer keys.
select tests.run_as(:AD, $$insert into video_question_sets (id, title) values ('30000000-0000-0000-0000-000000000004', 'Empty')$$, 'aal2');
select ok(tests.denied_as(:AD, $$insert into video_question_sets (title) values ('No MFA')$$), 'only MFA admins create video question sets');
select ok(tests.denied_as(:E3, $$insert into video_question_sets (title) values ('Employer')$$, 'aal2'), 'employers cannot create video question sets');
select ok(tests.denied_as(:AD, $$select admin_activate_video_set('30000000-0000-0000-0000-000000000004')$$, 'aal2'),
  'a video set without questions cannot go live');
insert into tests (id, title, pass_score) values ('30000000-0000-0000-0000-000000000009', 'No keys', 0);
insert into test_questions (test_id, type, prompt, options, position)
  values ('30000000-0000-0000-0000-000000000009', 'single_choice', 'Pick one', '["a","b"]', 0);
update tests set is_active = false;
select lives_ok($$select tests.run_as('00000000-0000-0000-0000-0000000000ad', 'select admin_activate_test(''30000000-0000-0000-0000-000000000009'')', 'aal2')$$,
  'a test goes live without any "correct" answers');
update tests set is_active = false;
update tests set is_active = true where id = '30000000-0000-0000-0000-000000000001';

-- After approval: the name is visible, the rest is locked until 1 E-coin is spent.
select is(tests.rows_as(:E3, format('select * from sponsor_list_candidates(%s) where not unlocked', :'JC')), 1, 'the sponsor sees the new candidate, still locked');
select is((select full_name from (select tests.act_as(:E3, 'aal1')) x, sponsor_candidate_summary(:'aa_id')), 'Sara Ali',
  'the sponsor sees the candidate''s name before unlocking');
reset role;
select ok(tests.denied_as(:E3, format('select sponsor_get_candidate(%L)', :'aa_id')), 'a locked candidate cannot be opened');
select is(tests.rows_as(:E3, 'select 1 from application_videos'), 0, 'a locked candidate''s video is hidden');
select throws_ok(format('select tests.run_as(%L, %L)', :E3, format('select sponsor_unlock_candidate(%L)', :'aa_id')),
  '22023', 'no_coins', 'unlocking needs an E-coin');
select ok(tests.denied_as(:E3, format('select admin_add_ecoins(%L, 5, '''')', :E3), 'aal2'), 'sponsors cannot give themselves E-coins');
select ok(tests.denied_as(:AD, format('select admin_add_ecoins(%L, 5, '''')', :E3)), 'adding E-coins needs an MFA admin');
select tests.run_as(:AD, format('select admin_add_ecoins(%L, 2, ''Welcome'')', :E3), 'aal2');
select ok(tests.denied_as(:AD, format('select admin_add_ecoins(%L, -5, '''')', :E3), 'aal2'), 'a balance cannot go below zero');
select tests.run_as(:E3, format('select sponsor_unlock_candidate(%L)', :'aa_id'));
select tests.run_as(:E3, format('select sponsor_unlock_candidate(%L)', :'aa_id'));
select is((select ecoin_balance from employer_profiles where user_id = :E3), 1, 'unlocking costs 1 E-coin, and only once');
select is((select string_agg(reason || ':' || delta, ',' order by created_at) from ecoin_ledger where employer_id = :E3),
  'admin_grant:2,unlock:-1', 'every coin movement is in the ledger');
select ok(tests.denied_as(:E3, $$update employer_profiles set ecoin_balance = 99 where user_id = auth.uid()$$), 'sponsors cannot edit their balance');
select ok(tests.denied_as(:E3, $$insert into candidate_unlocks (application_id, employer_id) values (gen_random_uuid(), auth.uid())$$), 'sponsors cannot unlock without paying');
select throws_ok($$update ecoin_ledger set delta = 50$$, '42501', 'append_only', 'ledger entries can never be changed');

-- Unlocked: the sponsor sees everything (with the test answers), nobody else does.
select ok(not tests.denied_as(:E3, format('select sponsor_get_candidate(%L)', :'aa_id')), 'the sponsor can open the unlocked candidate');
select is((select jsonb_array_length(sponsor_get_candidate(:'aa_id') -> 'test') from (select tests.act_as(:E3, 'aal1')) x), 4,
  'the unlocked candidate includes the test answers');
reset role;
select is(tests.rows_as(:E1, format('select * from sponsor_list_candidates(%s)', :'JC')), 0, 'another sponsor sees nothing for that job');
select ok(tests.denied_as(:E1, format('select sponsor_get_candidate(%L)', :'aa_id')), 'another sponsor cannot open the candidate');
select ok(tests.denied_as(:E1, format('select sponsor_unlock_candidate(%L)', :'aa_id')), 'another sponsor cannot unlock the candidate');
select is(tests.rows_as(:E3, 'select 1 from application_videos'), 0, 'sponsors don''t read video rows directly (only through logged views)');
select is(tests.rows_as(:E3, 'select 1 from applications'), 0, 'sponsors still cannot read the applications table (admin notes stay private)');
select is((select log_video_view(:'video_id') like :'aa_id' || '/%' from (select tests.act_as(:E3, 'aal1')) x), true,
  'a logged view gives the sponsor the video''s path');
reset role;
select ok(exists (select 1 from audit_logs where action = 'application.video_viewed' and actor_id = :E3::uuid), 'a sponsor''s video view is logged');
select ok(tests.denied_as(:E1, format('select log_video_view(%L)', :'video_id')), 'another sponsor cannot watch the video');
insert into storage.objects (bucket_id, name) values ('application-videos', :'aa_id' || '/answer/one.webm');
select is(tests.rows_as(:E3, $$select 1 from storage.objects where bucket_id = 'application-videos' and name not like 'demo/%'$$), 0, 'storage: sponsors never read video files directly');
insert into storage.objects (bucket_id, name) values ('application-cvs', :'aa_id' || '/cv/cv.pdf');
select is(tests.rows_as(:E3, $$select 1 from storage.objects where bucket_id = 'application-cvs'$$), 0, 'storage: sponsors never read CV files directly');
select is(tests.rows_as(:E1, $$select 1 from storage.objects where bucket_id = 'application-cvs'$$), 0, 'storage: other sponsors read no CVs');
select ok((select (sponsor_get_candidate(:'aa_id') ->> 'has_cv')::boolean from (select tests.act_as(:E3, 'aal1')) x), 'the sponsor sees there is a CV');
reset role;
select is(tests.rows_as(:E1, $$select 1 from storage.objects where bucket_id = 'application-videos'$$), 0, 'storage: other sponsors read no video files');

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

-- CSV exports are MFA-admin only and always logged, without personal data.
select ok(tests.denied_as(:AD, $$select log_admin_export('applications', 3)$$), 'exports need MFA');
select ok(tests.denied_as(:E3, $$select log_admin_export('applications', 3)$$, 'aal2'), 'sponsors cannot export');
select ok(tests.denied_as(:AD, $$select log_admin_export('everything', 3)$$, 'aal2'), 'only known exports');
select tests.run_as(:AD, $$select log_admin_export('applications', 3)$$, 'aal2');
select is((select metadata::text from audit_logs where action = 'export.applications' order by created_at desc limit 1),
  '{"rows": 3}', 'the export is logged with its row count only');

select * from finish();
rollback;
