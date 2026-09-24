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
delete from public.video_prompts;
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
