-- =============================================================================
-- LOCAL DEVELOPMENT SEED ONLY. Runs on `supabase db reset`, never in production.
-- Everything here is [SAMPLE] placeholder content; the client provides the
-- real survey, test and video questions.
--
-- Local logins (password for all: Wemuste-Local-2026!)
--   admin@wemuste.local     admin (enroll an authenticator app on first login)
--   employer@wemuste.local  approved employer "Sample Cafe Group"
-- =============================================================================

create or replace function pg_temp.seed_user(p_id uuid, p_email text, p_user_meta jsonb, p_app_meta jsonb)
returns void language plpgsql as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, reauthentication_token, phone_change, phone_change_token)
  values (
    '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email,
    extensions.crypt('Wemuste-Local-2026!', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb || p_app_meta, p_user_meta, now(), now(),
    '', '', '', '', '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), p_id, p_id::text,
          jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
          'email', now(), now(), now());
end $$;

select pg_temp.seed_user('10000000-0000-0000-0000-000000000001', 'admin@wemuste.local', '{}', '{}');
-- Admins get their profile from the create-admin script; do the same here.
insert into public.profiles (id, role, full_name) values ('10000000-0000-0000-0000-000000000001', 'admin', 'Local Admin');

select pg_temp.seed_user('10000000-0000-0000-0000-000000000002', 'employer@wemuste.local', '{}',
  '{"wemuste_role":"employer","company_name":"Sample Cafe Group","contact_person":"Omar Ali","contact_phone":"+971 50 000 0000"}');
update public.employer_profiles
   set status = 'approved', approved_at = now(), approved_by = '10000000-0000-0000-0000-000000000001',
       must_change_password = false
 where user_id = '10000000-0000-0000-0000-000000000002';

-- [SAMPLE] onboarding content
insert into public.surveys (id, title, version, is_active)
values ('20000000-0000-0000-0000-000000000001', '[SAMPLE] Work preferences', 1, true);
insert into public.survey_questions (survey_id, type, prompt, options, required, position) values
  ('20000000-0000-0000-0000-000000000001', 'single_choice', '[SAMPLE] How soon can you start?',
   '["Today","This week","This month"]', true, 0),
  ('20000000-0000-0000-0000-000000000001', 'multi_choice', '[SAMPLE] Which kinds of work interest you?',
   '["Hospitality","Retail","Delivery","Cleaning","Office"]', true, 1),
  ('20000000-0000-0000-0000-000000000001', 'short_text', '[SAMPLE] What is your strongest skill?', '[]', false, 2);

insert into public.tests (id, title, time_limit_seconds, pass_score, is_active)
values ('20000000-0000-0000-0000-000000000002', '[SAMPLE] Basic workplace test', 300, 50, true);
insert into public.test_questions (id, test_id, prompt, options, position) values
  ('20000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002',
   '[SAMPLE] A customer is upset about a late order. What do you do first?',
   '["Ignore it","Listen and apologise","Call the manager immediately"]', 0),
  ('20000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002',
   '[SAMPLE] Your shift starts at 9:00. When should you arrive?', '["9:15","9:00","8:50"]', 1);
insert into public.test_answer_keys (question_id, correct_option) values
  ('20000000-0000-0000-0000-000000000003', 1),
  ('20000000-0000-0000-0000-000000000004', 2);

insert into public.video_prompts (prompt, max_seconds, position) values
  ('[SAMPLE] Introduce yourself in 30 seconds.', 45, 0),
  ('[SAMPLE] Tell us about a time you helped a customer.', 90, 1);

-- [SAMPLE] jobs around Dubai (title, description, location only)
insert into public.jobs (employer_id, title, description, location_label, lat, lng) values
  ('10000000-0000-0000-0000-000000000002', '[SAMPLE] Weekend barista',
   'Make coffee and serve customers at a busy beachside cafe on weekends. Training provided.',
   'Dubai Marina, Dubai', 25.0805, 55.1403),
  ('10000000-0000-0000-0000-000000000002', '[SAMPLE] Evening cashier',
   'Handle payments and help customers in our supermarket, 6pm to 11pm.',
   'Jumeirah Lake Towers, Dubai', 25.0693, 55.1413),
  ('10000000-0000-0000-0000-000000000002', '[SAMPLE] Bike delivery rider',
   'Deliver food orders around Downtown. Bike provided; UAE license required.',
   'Downtown Dubai, Dubai', 25.1972, 55.2744),
  ('10000000-0000-0000-0000-000000000002', '[SAMPLE] Office cleaner (mornings)',
   'Clean a small office before opening, 3 hours a day, Monday to Friday.',
   'Business Bay, Dubai', 25.1851, 55.2796),
  ('10000000-0000-0000-0000-000000000002', '[SAMPLE] Event staff for a product launch',
   'Welcome guests and hand out samples at a one-day event.',
   'Al Quoz, Dubai', 25.1415, 55.2262),
  ('10000000-0000-0000-0000-000000000002', '[SAMPLE] Front desk receptionist',
   'Greet visitors and answer phones at a clinic. Arabic is a plus.',
   'Deira, Dubai', 25.2654, 55.3235),
  ('10000000-0000-0000-0000-000000000002', '[SAMPLE] Shop assistant',
   'Help customers and keep shelves tidy in a mall store. Part-time shifts.',
   'Al Majaz, Sharjah', 25.3257, 55.3853),
  ('10000000-0000-0000-0000-000000000002', '[SAMPLE] Warehouse helper',
   'Pack and label orders in a warehouse. Morning shift, transport provided.',
   'Mussafah, Abu Dhabi', 24.3486, 54.5003);
