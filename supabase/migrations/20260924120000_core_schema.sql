-- =============================================================================
-- Wemuste: core schema, RLS, helper functions, RPCs and storage
-- =============================================================================
-- Security model in one paragraph:
--   * Default deny. `anon` has no table privileges at all. `authenticated` gets
--     only the table/column privileges listed in section 9, and every table has
--     RLS enabled AND forced.
--   * Roles live in public.profiles.role (never user_metadata) and can only be
--     changed by direct SQL (the create-admin script), never through the API.
--   * Employers see employee data only through public.access_grants, via
--     private.has_active_grant(): approved employer + approved employee +
--     unrevoked + unexpired + the scope requested.
--   * Anything that changes a status, grants access, grades a test or must be
--     audited goes through a SECURITY DEFINER RPC (section 8) so the rule and
--     the audit entry live in one transaction. Clients never write those
--     columns directly.
--   * Admin policies and admin RPCs require MFA (aal2), for reads as well as writes.
--   * Helpers used by policies live in the `private` schema, which PostgREST
--     does not expose, so they cannot be called through /rpc.
-- =============================================================================

-- Tables use FORCE ROW LEVEL SECURITY, so the SECURITY DEFINER functions below
-- only work if their owner bypasses RLS. On Supabase the `postgres` role has
-- BYPASSRLS; fail loudly if that assumption ever stops holding.
do $$
begin
  if not (select rolbypassrls from pg_roles where rolname = current_user) then
    raise exception 'Migration owner % must have BYPASSRLS (tables use FORCE RLS)', current_user;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 0. Default privileges: nothing is granted unless this file grants it.
--    Supabase grants ALL on new public objects to anon/authenticated by default.
-- -----------------------------------------------------------------------------
alter default privileges for role postgres in schema public revoke all on tables    from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated;
alter default privileges for role postgres revoke execute on functions from public;

create schema if not exists private;
revoke all on schema private from public, anon;
-- Policies run as the caller, so `authenticated` must be able to execute the
-- policy helpers. The schema is not exposed by the Data API.
grant usage on schema private to authenticated;

-- -----------------------------------------------------------------------------
-- 1. Enums
-- -----------------------------------------------------------------------------
create type public.user_role        as enum ('employee', 'employer', 'admin');
create type public.employee_status  as enum ('draft', 'submitted', 'approved', 'hidden');
create type public.employer_status  as enum ('pending', 'approved', 'suspended');
create type public.availability     as enum ('evenings', 'weekends', 'part_time', 'full_time', 'flexible');
create type public.question_type    as enum ('single_choice', 'multi_choice', 'short_text', 'long_text', 'number', 'scale');
create type public.video_provider   as enum ('supabase', 'mux');
create type public.video_status     as enum ('uploaded', 'approved', 'rejected');
create type public.meeting_status   as enum ('requested', 'accepted', 'declined', 'cancelled', 'completed');
create type public.consent_type     as enum ('terms', 'privacy', 'data_sharing');

-- -----------------------------------------------------------------------------
-- 2. Generic triggers
-- -----------------------------------------------------------------------------
create function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. Tables
-- -----------------------------------------------------------------------------

-- 3.1 Identity -----------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        public.user_role not null default 'employee',
  full_name   text not null default '' check (char_length(full_name) <= 120),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.employee_profiles (
  user_id             uuid primary key references public.profiles (id) on delete cascade,
  headline            text check (char_length(headline) <= 120),
  city_emirate        text check (char_length(city_emirate) <= 80),
  languages           text[] not null default '{}' check (cardinality(languages) <= 10),
  skills              text[] not null default '{}' check (cardinality(skills) <= 30),
  availability        public.availability[] not null default '{}',
  expected_pay_range  text check (char_length(expected_pay_range) <= 60),
  onboarding_step     smallint not null default 0 check (onboarding_step between 0 and 6),
  status              public.employee_status not null default 'draft',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Kept apart from employee_profiles so it is only visible under the `contact` scope.
create table public.employee_contacts (
  user_id     uuid primary key references public.employee_profiles (user_id) on delete cascade,
  phone       text check (char_length(phone) <= 32),
  email       text check (char_length(email) <= 254),
  whatsapp    text check (char_length(whatsapp) <= 32),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.employer_profiles (
  user_id           uuid primary key references public.profiles (id) on delete cascade,
  company_name      text not null default '' check (char_length(company_name) <= 160),
  trade_license_no  text check (char_length(trade_license_no) <= 64),
  contact_person    text check (char_length(contact_person) <= 120),
  contact_phone     text check (char_length(contact_phone) <= 32),
  website           text check (char_length(website) <= 255),
  status            public.employer_status not null default 'pending',
  approved_by       uuid references public.profiles (id) on delete set null,
  approved_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- 3.2 Surveys -------------------------------------------------------------------
create table public.surveys (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 200),
  version     integer not null default 1 check (version > 0),
  is_active   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- One active survey at a time keeps the onboarding wizard deterministic.
create unique index surveys_single_active on public.surveys (is_active) where is_active;

create table public.survey_questions (
  id          uuid primary key default gen_random_uuid(),
  survey_id   uuid not null references public.surveys (id) on delete cascade,
  type        public.question_type not null,
  prompt      text not null check (char_length(prompt) between 1 and 1000),
  options     jsonb not null default '[]' check (jsonb_typeof(options) = 'array'),
  required    boolean not null default true,
  position    integer not null check (position >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint survey_questions_position_unique unique (survey_id, position) deferrable initially deferred
);

create table public.survey_responses (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references public.employee_profiles (user_id) on delete cascade,
  survey_id     uuid not null references public.surveys (id) on delete restrict,
  submitted_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (employee_id, survey_id)
);

create table public.survey_answers (
  response_id  uuid not null references public.survey_responses (id) on delete cascade,
  -- restrict: an answered question cannot be deleted; publish a new survey version instead.
  question_id  uuid not null references public.survey_questions (id) on delete restrict,
  answer       jsonb not null check (pg_column_size(answer) <= 8192),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (response_id, question_id)
);

-- 3.3 Tests ---------------------------------------------------------------------
create table public.tests (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null check (char_length(title) between 1 and 200),
  time_limit_seconds  integer not null check (time_limit_seconds between 60 and 7200),
  pass_score          numeric(5,2) not null check (pass_score between 0 and 100),
  is_active           boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create unique index tests_single_active on public.tests (is_active) where is_active;

create table public.test_questions (
  id          uuid primary key default gen_random_uuid(),
  test_id     uuid not null references public.tests (id) on delete cascade,
  prompt      text not null check (char_length(prompt) between 1 and 1000),
  -- Array of option labels; answers and keys are zero-based indexes into it.
  options     jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 8),
  position    integer not null check (position >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint test_questions_position_unique unique (test_id, position) deferrable initially deferred
);

-- No policies are ever created on this table: nothing but SECURITY DEFINER code can read it.
create table public.test_answer_keys (
  question_id     uuid primary key references public.test_questions (id) on delete cascade,
  correct_option  smallint not null check (correct_option >= 0)
);

create table public.test_attempts (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references public.employee_profiles (user_id) on delete cascade,
  test_id       uuid not null references public.tests (id) on delete restrict,
  started_at    timestamptz not null default now(),
  submitted_at  timestamptz,
  score         numeric(5,2) check (score between 0 and 100),
  -- {"<question_id>": <option index>, ...}; written only by public.save_test_answer().
  answers       jsonb not null default '{}' check (jsonb_typeof(answers) = 'object'),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- One attempt per test. An admin can delete an attempt to allow a retake.
  unique (employee_id, test_id)
);

-- 3.4 Video and documents -------------------------------------------------------
create table public.video_prompts (
  id           uuid primary key default gen_random_uuid(),
  prompt       text not null check (char_length(prompt) between 1 and 500),
  max_seconds  integer not null default 90 check (max_seconds between 10 and 300),
  position     integer not null default 0,
  created_by   uuid references public.profiles (id) on delete set null,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.video_resumes (
  id                uuid primary key default gen_random_uuid(),
  employee_id       uuid not null references public.employee_profiles (user_id) on delete cascade,
  -- restrict: deactivate prompts instead of deleting them.
  prompt_id         uuid not null references public.video_prompts (id) on delete restrict,
  -- Supabase: "{employee_id}/{uuid}.{ext}" inside the video-resumes bucket.
  -- Mux (later): the asset/playback id. Switching provider is a data migration only.
  storage_path      text not null unique check (char_length(storage_path) <= 255),
  provider          public.video_provider not null default 'supabase',
  duration_seconds  integer check (duration_seconds between 1 and 300),
  status            public.video_status not null default 'uploaded',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- One answer per prompt; a retake deletes and re-inserts.
  unique (employee_id, prompt_id)
);

create table public.cv_documents (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null unique references public.employee_profiles (user_id) on delete cascade,
  storage_path text not null unique check (char_length(storage_path) <= 255),
  mime_type    text not null check (mime_type in (
                 'application/pdf',
                 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  size_bytes   integer not null check (size_bytes between 1 and 5242880),
  created_at   timestamptz not null default now()
);

-- 3.5 Access grants (the core of the privacy model) ----------------------------
create table public.access_grants (
  id           uuid primary key default gen_random_uuid(),
  employer_id  uuid not null references public.employer_profiles (user_id) on delete cascade,
  employee_id  uuid not null references public.employee_profiles (user_id) on delete cascade,
  scopes       text[] not null check (
                 cardinality(scopes) > 0
                 and scopes <@ array['profile', 'survey', 'test', 'video', 'cv', 'contact']),
  granted_by   uuid references public.profiles (id) on delete set null,
  expires_at   timestamptz,
  revoked_at   timestamptz,
  revoked_by   uuid references public.profiles (id) on delete set null,
  note         text check (char_length(note) <= 500),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index access_grants_one_live_per_pair
  on public.access_grants (employer_id, employee_id) where revoked_at is null;
create index access_grants_employee_idx on public.access_grants (employee_id) where revoked_at is null;

-- 3.6 Meetings ------------------------------------------------------------------
create table public.meeting_requests (
  id              uuid primary key default gen_random_uuid(),
  employer_id     uuid not null references public.employer_profiles (user_id) on delete cascade,
  employee_id     uuid not null references public.employee_profiles (user_id) on delete cascade,
  -- [{"start": "<iso8601>", "end": "<iso8601>"}, ...], 1 to 3 slots, validated by Zod.
  proposed_slots  jsonb not null check (
                    jsonb_typeof(proposed_slots) = 'array'
                    and jsonb_array_length(proposed_slots) between 1 and 3),
  -- Zero-based index into proposed_slots, set when the employee accepts.
  chosen_slot     smallint check (chosen_slot between 0 and 2),
  meeting_link    text check (meeting_link ~ '^https://' and char_length(meeting_link) <= 500),
  status          public.meeting_status not null default 'requested',
  responded_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
-- At most one open request per employer/employee pair.
create unique index meeting_requests_one_open_per_pair
  on public.meeting_requests (employer_id, employee_id) where status = 'requested';
create index meeting_requests_employee_idx on public.meeting_requests (employee_id);

-- 3.7 Consents and audit ----------------------------------------------------------
create table public.consents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  type         public.consent_type not null,
  version      text not null check (char_length(version) between 1 and 32),
  accepted_at  timestamptz not null default now(),
  ip_hash      text check (char_length(ip_hash) <= 128)
);
create index consents_user_idx on public.consents (user_id, type);

-- Append-only. No FK on actor_id/target_id so entries survive account deletion
-- as pseudonymous records. Never put personal data in metadata.
create table public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid,
  action       text not null check (char_length(action) <= 64),
  target_type  text check (char_length(target_type) <= 64),
  target_id    uuid,
  metadata     jsonb not null default '{}' check (pg_column_size(metadata) <= 4096),
  ip_hash      text check (char_length(ip_hash) <= 128),
  created_at   timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_actor_idx   on public.audit_logs (actor_id, created_at desc);
create index audit_logs_target_idx  on public.audit_logs (target_type, target_id, created_at desc);
create index audit_logs_action_idx  on public.audit_logs (action, created_at desc);

-- 3.8 Rate limiting (private; used by server actions through the service role) --
create table private.rate_limits (
  key           text not null check (char_length(key) <= 200),
  window_start  timestamptz not null,
  hits          integer not null default 0,
  primary key (key, window_start)
);

-- 3.9 Indexes for policy and admin-filter columns --------------------------------
create index profiles_role_idx                 on public.profiles (role);
create index employee_profiles_status_idx      on public.employee_profiles (status);
create index employee_profiles_skills_idx      on public.employee_profiles using gin (skills);
create index employee_profiles_languages_idx   on public.employee_profiles using gin (languages);
create index employee_profiles_availability_idx on public.employee_profiles using gin (availability);
create index employer_profiles_status_idx      on public.employer_profiles (status);
create index survey_questions_survey_idx       on public.survey_questions (survey_id);
create index survey_answers_question_idx       on public.survey_answers (question_id);
create index test_questions_test_idx           on public.test_questions (test_id);
create index test_attempts_test_idx            on public.test_attempts (test_id);
create index video_resumes_prompt_idx          on public.video_resumes (prompt_id);

-- 3.10 updated_at triggers ----------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'employee_profiles', 'employee_contacts', 'employer_profiles',
    'surveys', 'survey_questions', 'survey_responses', 'survey_answers',
    'tests', 'test_questions', 'test_attempts', 'video_prompts', 'video_resumes',
    'access_grants', 'meeting_requests']
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function private.set_updated_at()', t);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Policy helpers (private schema, SECURITY DEFINER, STABLE, empty search_path)
-- -----------------------------------------------------------------------------
create function private.current_user_role()
returns public.user_role language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = (select auth.uid());
$$;

create function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles
                 where id = (select auth.uid()) and role = 'admin');
$$;

-- Admin with a completed MFA challenge in this session. Used by every admin policy.
create function private.is_mfa_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_admin() and coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2';
$$;

create function private.is_approved_employer()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.employer_profiles
                 where user_id = (select auth.uid()) and status = 'approved');
$$;

create function private.has_active_grant(p_employee_id uuid, p_scope text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.access_grants g
    join public.employer_profiles e on e.user_id = g.employer_id
    join public.employee_profiles p on p.user_id = g.employee_id
    where g.employer_id = (select auth.uid())
      and g.employee_id = p_employee_id
      and g.revoked_at is null
      and (g.expires_at is null or g.expires_at > now())
      and p_scope = any (g.scopes)
      and e.status = 'approved'
      -- Hidden or not-yet-approved employees are invisible even with a grant.
      and p.status = 'approved'
  );
$$;

-- Internal: only called from other SECURITY DEFINER functions.
create function private.log_audit(
  p_action text, p_target_type text, p_target_id uuid,
  p_metadata jsonb default '{}', p_ip_hash text default null)
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_logs (actor_id, action, target_type, target_id, metadata, ip_hash)
  values ((select auth.uid()), p_action, p_target_type, p_target_id,
          coalesce(p_metadata, '{}'), left(p_ip_hash, 128));
$$;

create function private.require_mfa_admin()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_mfa_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. Signup trigger: create profile rows, never assign admin
-- -----------------------------------------------------------------------------
create function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_meta     jsonb := coalesce(new.raw_user_meta_data, '{}');
  v_consents jsonb := coalesce(v_meta -> 'consents', '{}');
  v_ip_hash  text  := left(v_meta ->> 'ip_hash', 128);
  v_role     public.user_role;
  v_type     public.consent_type;
begin
  -- user_metadata is user-controlled: accept 'employer', everything else
  -- (including 'admin') becomes 'employee'. Values are only read here, once.
  v_role := case when v_meta ->> 'role' = 'employer'
                 then 'employer'::public.user_role
                 else 'employee'::public.user_role end;

  insert into public.profiles (id, role, full_name)
  values (new.id, v_role, left(btrim(coalesce(v_meta ->> 'full_name', '')), 120));

  if v_role = 'employee' then
    insert into public.employee_profiles (user_id) values (new.id);
    insert into public.employee_contacts (user_id, email) values (new.id, left(new.email, 254));
  else
    insert into public.employer_profiles (user_id, company_name, trade_license_no, contact_person, contact_phone)
    values (new.id,
            left(btrim(coalesce(v_meta ->> 'company_name', '')), 160),
            nullif(left(btrim(coalesce(v_meta ->> 'trade_license_no', '')), 64), ''),
            nullif(left(btrim(coalesce(v_meta ->> 'full_name', '')), 120), ''),
            nullif(left(btrim(coalesce(v_meta ->> 'contact_phone', '')), 32), ''));
  end if;

  -- Consent versions sent by the signup server action. Missing consent is not
  -- an error here (admins are created without it); the app gates on it and
  -- submit_employee_profile() requires data_sharing consent.
  foreach v_type in array enum_range(null::public.consent_type) loop
    if coalesce(v_consents ->> v_type::text, '') <> '' then
      insert into public.consents (user_id, type, version, ip_hash)
      values (new.id, v_type, left(v_consents ->> v_type::text, 32), v_ip_hash);
    end if;
  end loop;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- -----------------------------------------------------------------------------
-- 6. Guard triggers (defence in depth on top of column privileges)
-- -----------------------------------------------------------------------------

-- Role changes only from direct SQL (no JWT), e.g. the create-admin script.
create function private.guard_profile_role()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.role is distinct from old.role and (select auth.uid()) is not null then
    raise exception 'role cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger guard_role before update on public.profiles
  for each row execute function private.guard_profile_role();

-- Company identity is editable while pending, locked once reviewed.
create function private.guard_employer_identity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status <> 'pending'
     and (new.company_name is distinct from old.company_name
          or new.trade_license_no is distinct from old.trade_license_no)
     and (select auth.uid()) is not null
     and not private.is_mfa_admin() then
    raise exception 'company details are locked after review' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger guard_identity before update on public.employer_profiles
  for each row execute function private.guard_employer_identity();

-- audit_logs is append-only for everyone. A migration must explicitly disable
-- these triggers to change history.
create function private.block_audit_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'audit_logs is append-only' using errcode = '42501';
end;
$$;
create trigger block_update_delete before update or delete on public.audit_logs
  for each row execute function private.block_audit_mutation();
create trigger block_truncate before truncate on public.audit_logs
  for each statement execute function private.block_audit_mutation();

-- -----------------------------------------------------------------------------
-- 7. Row Level Security
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'employee_profiles', 'employee_contacts', 'employer_profiles',
    'surveys', 'survey_questions', 'survey_responses', 'survey_answers',
    'tests', 'test_questions', 'test_answer_keys', 'test_attempts',
    'video_prompts', 'video_resumes', 'cv_documents', 'access_grants',
    'meeting_requests', 'consents', 'audit_logs']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end;
$$;
alter table private.rate_limits enable row level security;
alter table private.rate_limits force row level security;

-- profiles --------------------------------------------------------------------
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
-- An employee's name identifies them, so employers need the `contact` scope.
create policy "profiles: employer reads granted names" on public.profiles
  for select to authenticated using (private.has_active_grant(id, 'contact'));
create policy "profiles: admin reads all" on public.profiles
  for select to authenticated using (private.is_mfa_admin());
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- employee_profiles -------------------------------------------------------------
create policy "employee_profiles: read own" on public.employee_profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy "employee_profiles: employer with profile scope" on public.employee_profiles
  for select to authenticated using (private.has_active_grant(user_id, 'profile'));
create policy "employee_profiles: admin reads all" on public.employee_profiles
  for select to authenticated using (private.is_mfa_admin());
create policy "employee_profiles: update own" on public.employee_profiles
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- employee_contacts ---------------------------------------------------------------
create policy "employee_contacts: read own" on public.employee_contacts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "employee_contacts: employer with contact scope" on public.employee_contacts
  for select to authenticated using (private.has_active_grant(user_id, 'contact'));
create policy "employee_contacts: admin reads all" on public.employee_contacts
  for select to authenticated using (private.is_mfa_admin());
create policy "employee_contacts: update own" on public.employee_contacts
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- employer_profiles ---------------------------------------------------------------
create policy "employer_profiles: read own" on public.employer_profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy "employer_profiles: admin reads all" on public.employer_profiles
  for select to authenticated using (private.is_mfa_admin());
create policy "employer_profiles: update own" on public.employer_profiles
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- surveys / survey_questions ----------------------------------------------------------
create policy "surveys: employees read active or answered" on public.surveys
  for select to authenticated using (
    (private.current_user_role() = 'employee'
      and (is_active or exists (select 1 from public.survey_responses r
                                where r.survey_id = surveys.id
                                  and r.employee_id = (select auth.uid()))))
    or private.is_approved_employer()   -- needed to read the wording of granted answers
    or private.is_mfa_admin());
create policy "surveys: admin writes" on public.surveys
  for all to authenticated using (private.is_mfa_admin()) with check (private.is_mfa_admin());

create policy "survey_questions: readable with parent survey" on public.survey_questions
  for select to authenticated using (
    exists (select 1 from public.surveys s where s.id = survey_questions.survey_id));
create policy "survey_questions: admin writes" on public.survey_questions
  for all to authenticated using (private.is_mfa_admin()) with check (private.is_mfa_admin());

-- survey_responses / survey_answers -------------------------------------------------------
create policy "survey_responses: read own" on public.survey_responses
  for select to authenticated using (employee_id = (select auth.uid()));
create policy "survey_responses: employer with survey scope" on public.survey_responses
  for select to authenticated using (
    submitted_at is not null and private.has_active_grant(employee_id, 'survey'));
create policy "survey_responses: admin reads all" on public.survey_responses
  for select to authenticated using (private.is_mfa_admin());
create policy "survey_responses: employee starts active survey" on public.survey_responses
  for insert to authenticated with check (
    employee_id = (select auth.uid())
    and private.current_user_role() = 'employee'
    and exists (select 1 from public.surveys s where s.id = survey_id and s.is_active));

create policy "survey_answers: read with response" on public.survey_answers
  for select to authenticated using (
    exists (select 1 from public.survey_responses r where r.id = survey_answers.response_id));
create policy "survey_answers: employee writes own draft" on public.survey_answers
  for insert to authenticated with check (
    exists (select 1 from public.survey_responses r
            join public.survey_questions q on q.survey_id = r.survey_id
            where r.id = response_id and q.id = question_id
              and r.employee_id = (select auth.uid()) and r.submitted_at is null));
create policy "survey_answers: employee edits own draft" on public.survey_answers
  for update to authenticated
  using (exists (select 1 from public.survey_responses r
                 where r.id = response_id
                   and r.employee_id = (select auth.uid()) and r.submitted_at is null))
  with check (exists (select 1 from public.survey_responses r
                      where r.id = response_id
                        and r.employee_id = (select auth.uid()) and r.submitted_at is null));

-- tests / test_questions / test_attempts -------------------------------------------------------
create policy "tests: employees read active or attempted" on public.tests
  for select to authenticated using (
    (private.current_user_role() = 'employee'
      and (is_active or exists (select 1 from public.test_attempts a
                                where a.test_id = tests.id
                                  and a.employee_id = (select auth.uid()))))
    or private.is_mfa_admin());
create policy "tests: admin writes" on public.tests
  for all to authenticated using (private.is_mfa_admin()) with check (private.is_mfa_admin());

-- Questions are only visible once the timer has started (via start_test_attempt).
create policy "test_questions: employee during own attempt" on public.test_questions
  for select to authenticated using (
    exists (select 1 from public.test_attempts a
            where a.test_id = test_questions.test_id
              and a.employee_id = (select auth.uid())));
create policy "test_questions: admin all" on public.test_questions
  for all to authenticated using (private.is_mfa_admin()) with check (private.is_mfa_admin());

-- test_answer_keys: intentionally NO policies.

create policy "test_attempts: read own" on public.test_attempts
  for select to authenticated using (employee_id = (select auth.uid()));
create policy "test_attempts: employer with test scope" on public.test_attempts
  for select to authenticated using (
    submitted_at is not null and private.has_active_grant(employee_id, 'test'));
create policy "test_attempts: admin reads" on public.test_attempts
  for select to authenticated using (private.is_mfa_admin());
create policy "test_attempts: admin deletes (allow retake)" on public.test_attempts
  for delete to authenticated using (private.is_mfa_admin());

-- video_prompts / video_resumes ------------------------------------------------------------
create policy "video_prompts: employees read active" on public.video_prompts
  for select to authenticated using (
    (is_active and private.current_user_role() = 'employee')
    or exists (select 1 from public.video_resumes v   -- prompt text for granted videos
               where v.prompt_id = video_prompts.id)
    or private.is_mfa_admin());
create policy "video_prompts: admin writes" on public.video_prompts
  for all to authenticated using (private.is_mfa_admin()) with check (private.is_mfa_admin());

create policy "video_resumes: read own" on public.video_resumes
  for select to authenticated using (employee_id = (select auth.uid()));
create policy "video_resumes: employer with video scope" on public.video_resumes
  for select to authenticated using (
    status = 'approved' and private.has_active_grant(employee_id, 'video'));
create policy "video_resumes: admin reads" on public.video_resumes
  for select to authenticated using (private.is_mfa_admin());
create policy "video_resumes: employee adds own" on public.video_resumes
  for insert to authenticated with check (
    employee_id = (select auth.uid())
    and private.current_user_role() = 'employee'
    and split_part(storage_path, '/', 1) = (select auth.uid())::text
    and exists (select 1 from public.video_prompts p
                where p.id = prompt_id and p.is_active
                  and (duration_seconds is null or duration_seconds <= p.max_seconds)));
create policy "video_resumes: employee deletes own" on public.video_resumes
  for delete to authenticated using (employee_id = (select auth.uid()));
create policy "video_resumes: admin reviews" on public.video_resumes
  for update to authenticated using (private.is_mfa_admin()) with check (private.is_mfa_admin());

-- cv_documents -----------------------------------------------------------------------------
create policy "cv_documents: read own" on public.cv_documents
  for select to authenticated using (employee_id = (select auth.uid()));
create policy "cv_documents: employer with cv scope" on public.cv_documents
  for select to authenticated using (private.has_active_grant(employee_id, 'cv'));
create policy "cv_documents: admin reads" on public.cv_documents
  for select to authenticated using (private.is_mfa_admin());
create policy "cv_documents: employee adds own" on public.cv_documents
  for insert to authenticated with check (
    employee_id = (select auth.uid())
    and private.current_user_role() = 'employee'
    and split_part(storage_path, '/', 1) = (select auth.uid())::text);
create policy "cv_documents: employee deletes own" on public.cv_documents
  for delete to authenticated using (employee_id = (select auth.uid()));

-- access_grants: admins read directly; employers list candidates via
-- employer_list_candidates() so they never see notes/granted_by and are paginated.
-- All writes go through admin_grant_access() / admin_revoke_grant().
create policy "access_grants: admin reads" on public.access_grants
  for select to authenticated using (private.is_mfa_admin());

-- meeting_requests: status changes only via RPCs.
create policy "meeting_requests: employer reads own" on public.meeting_requests
  for select to authenticated using (
    employer_id = (select auth.uid()) and private.is_approved_employer());
create policy "meeting_requests: employee reads own" on public.meeting_requests
  for select to authenticated using (employee_id = (select auth.uid()));
create policy "meeting_requests: admin reads" on public.meeting_requests
  for select to authenticated using (private.is_mfa_admin());
create policy "meeting_requests: employer creates with grant" on public.meeting_requests
  for insert to authenticated with check (
    employer_id = (select auth.uid())
    and private.has_active_grant(employee_id, 'profile'));

-- consents ----------------------------------------------------------------------------------
create policy "consents: read own" on public.consents
  for select to authenticated using (user_id = (select auth.uid()));
create policy "consents: admin reads" on public.consents
  for select to authenticated using (private.is_mfa_admin());
create policy "consents: record own" on public.consents
  for insert to authenticated with check (user_id = (select auth.uid()));

-- audit_logs: inserts only via private.log_audit(); nobody updates or deletes.
create policy "audit_logs: admin reads" on public.audit_logs
  for select to authenticated using (private.is_mfa_admin());

-- private.rate_limits: no policies; only check_rate_limit() touches it.

-- -----------------------------------------------------------------------------
-- 8. RPCs (public schema, SECURITY DEFINER). Each checks the caller itself.
-- -----------------------------------------------------------------------------

-- 8.1 Admin: employer/employee status ---------------------------------------------
create function public.admin_set_employer_status(p_employer_id uuid, p_status public.employer_status)
returns void language plpgsql security definer set search_path = '' as $$
declare v_old public.employer_status;
begin
  perform private.require_mfa_admin();
  select status into v_old from public.employer_profiles where user_id = p_employer_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if v_old = p_status then return; end if;

  update public.employer_profiles
     set status = p_status,
         approved_by = case when p_status = 'approved' then (select auth.uid()) else approved_by end,
         approved_at = case when p_status = 'approved' then now() else approved_at end
   where user_id = p_employer_id;

  perform private.log_audit('employer.status_changed', 'employer', p_employer_id,
                            jsonb_build_object('from', v_old, 'to', p_status));
end;
$$;

create function public.admin_set_employee_status(p_employee_id uuid, p_status public.employee_status)
returns void language plpgsql security definer set search_path = '' as $$
declare v_old public.employee_status;
begin
  perform private.require_mfa_admin();
  select status into v_old from public.employee_profiles where user_id = p_employee_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if v_old = p_status then return; end if;

  update public.employee_profiles set status = p_status where user_id = p_employee_id;
  perform private.log_audit('employee.status_changed', 'employee', p_employee_id,
                            jsonb_build_object('from', v_old, 'to', p_status));
end;
$$;

-- 8.2 Admin: grants --------------------------------------------------------------------------
-- Replaces any live grant for each pair (old one is revoked, keeping history).
create function public.admin_grant_access(
  p_employer_id uuid, p_employee_ids uuid[], p_scopes text[],
  p_expires_at timestamptz default null, p_note text default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_employee uuid;
  v_grant    uuid;
  v_count    integer := 0;
begin
  perform private.require_mfa_admin();
  if cardinality(p_employee_ids) not between 1 and 100 then
    raise exception 'invalid_employee_count' using errcode = '22023';
  end if;
  if p_expires_at is not null and p_expires_at <= now() then
    raise exception 'invalid_expiry' using errcode = '22023';
  end if;
  if not exists (select 1 from public.employer_profiles
                 where user_id = p_employer_id and status = 'approved') then
    raise exception 'employer_not_approved' using errcode = '22023';
  end if;

  foreach v_employee in array (select array_agg(distinct e) from unnest(p_employee_ids) e) loop
    if not exists (select 1 from public.employee_profiles
                   where user_id = v_employee and status = 'approved') then
      raise exception 'employee_not_approved' using errcode = '22023';
    end if;

    update public.access_grants
       set revoked_at = now(), revoked_by = (select auth.uid())
     where employer_id = p_employer_id and employee_id = v_employee and revoked_at is null;

    insert into public.access_grants (employer_id, employee_id, scopes, granted_by, expires_at, note)
    values (p_employer_id, v_employee,
            (select array_agg(distinct s order by s) from unnest(p_scopes) s),
            (select auth.uid()), p_expires_at, left(p_note, 500))
    returning id into v_grant;

    perform private.log_audit('grant.created', 'access_grant', v_grant,
      jsonb_build_object('employer_id', p_employer_id, 'employee_id', v_employee,
                         'scopes', p_scopes, 'expires_at', p_expires_at));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create function public.admin_revoke_grant(p_grant_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_mfa_admin();
  update public.access_grants
     set revoked_at = now(), revoked_by = (select auth.uid())
   where id = p_grant_id and revoked_at is null;
  if found then
    perform private.log_audit('grant.revoked', 'access_grant', p_grant_id);
  end if;
end;
$$;

-- 8.3 Admin: test answer keys ------------------------------------------------------------------
create function public.admin_set_answer_key(p_question_id uuid, p_correct_option smallint)
returns void language plpgsql security definer set search_path = '' as $$
declare v_options integer;
begin
  perform private.require_mfa_admin();
  select jsonb_array_length(options) into v_options from public.test_questions where id = p_question_id;
  if v_options is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  if p_correct_option < 0 or p_correct_option >= v_options then
    raise exception 'invalid_option' using errcode = '22023';
  end if;
  insert into public.test_answer_keys (question_id, correct_option)
  values (p_question_id, p_correct_option)
  on conflict (question_id) do update set correct_option = excluded.correct_option;
  perform private.log_audit('test.answer_key_set', 'test_question', p_question_id);
end;
$$;

create function public.admin_get_answer_keys(p_test_id uuid)
returns table (question_id uuid, correct_option smallint)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_mfa_admin();
  return query
    select k.question_id, k.correct_option
    from public.test_answer_keys k
    join public.test_questions q on q.id = k.question_id
    where q.test_id = p_test_id;
end;
$$;

-- 8.4 Employee: test flow (time limit enforced here, never on the client) -------------------
create function public.start_test_attempt(p_test_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_attempt public.test_attempts;
begin
  if private.current_user_role() is distinct from 'employee' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_attempt from public.test_attempts
   where employee_id = (select auth.uid()) and test_id = p_test_id;
  if found then
    if v_attempt.submitted_at is not null then
      raise exception 'already_submitted' using errcode = '22023';
    end if;
    return v_attempt.id;   -- resume; the clock keeps running from started_at
  end if;
  if not exists (select 1 from public.tests where id = p_test_id and is_active) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  insert into public.test_attempts (employee_id, test_id)
  values ((select auth.uid()), p_test_id)
  returning id into v_attempt.id;
  return v_attempt.id;
end;
$$;

create function public.save_test_answer(p_attempt_id uuid, p_question_id uuid, p_option smallint)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_deadline timestamptz;
  v_options  integer;
begin
  select a.started_at + make_interval(secs => t.time_limit_seconds + 5)  -- 5 s network grace
    into v_deadline
    from public.test_attempts a join public.tests t on t.id = a.test_id
   where a.id = p_attempt_id and a.employee_id = (select auth.uid()) and a.submitted_at is null
   for update of a;
  if v_deadline is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  if now() > v_deadline then raise exception 'time_expired' using errcode = '22023'; end if;

  select jsonb_array_length(q.options) into v_options
    from public.test_questions q join public.test_attempts a on a.test_id = q.test_id
   where q.id = p_question_id and a.id = p_attempt_id;
  if v_options is null or p_option < 0 or p_option >= v_options then
    raise exception 'invalid_answer' using errcode = '22023';
  end if;

  update public.test_attempts
     set answers = answers || jsonb_build_object(p_question_id::text, p_option)
   where id = p_attempt_id;
end;
$$;

-- Grades using only answers saved before the deadline. Returns nothing: the
-- client learns the attempt is submitted, not which answers were right.
create function public.submit_test_attempt(p_attempt_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_attempt public.test_attempts;
  v_total   integer;
  v_correct integer;
begin
  select * into v_attempt from public.test_attempts
   where id = p_attempt_id and employee_id = (select auth.uid()) and submitted_at is null
   for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;

  select count(*), count(*) filter (where (v_attempt.answers ->> q.id::text)::smallint = k.correct_option)
    into v_total, v_correct
    from public.test_questions q
    left join public.test_answer_keys k on k.question_id = q.id
   where q.test_id = v_attempt.test_id;

  update public.test_attempts
     set submitted_at = now(),
         score = case when v_total = 0 then 0 else round(100.0 * v_correct / v_total, 2) end
   where id = p_attempt_id;
end;
$$;

-- 8.5 Employee: survey and profile submission ------------------------------------------------------
create function public.submit_survey_response(p_response_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_survey uuid;
begin
  select survey_id into v_survey from public.survey_responses
   where id = p_response_id and employee_id = (select auth.uid()) and submitted_at is null
   for update;
  if v_survey is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  if exists (select 1 from public.survey_questions q
             where q.survey_id = v_survey and q.required
               and not exists (select 1 from public.survey_answers a
                               where a.response_id = p_response_id and a.question_id = q.id)) then
    raise exception 'incomplete' using errcode = '22023';
  end if;
  update public.survey_responses set submitted_at = now() where id = p_response_id;
end;
$$;

create function public.submit_employee_profile()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_p   public.employee_profiles;
begin
  select * into v_p from public.employee_profiles where user_id = v_uid for update;
  if not found then raise exception 'forbidden' using errcode = '42501'; end if;
  if v_p.status <> 'draft' then return; end if;

  if v_p.city_emirate is null or cardinality(v_p.languages) = 0 or cardinality(v_p.availability) = 0
     or not exists (select 1 from public.consents where user_id = v_uid and type = 'data_sharing')
     or exists (select 1 from public.surveys s where s.is_active and not exists (
                  select 1 from public.survey_responses r
                  where r.survey_id = s.id and r.employee_id = v_uid and r.submitted_at is not null))
     or exists (select 1 from public.tests t where t.is_active and not exists (
                  select 1 from public.test_attempts a
                  where a.test_id = t.id and a.employee_id = v_uid and a.submitted_at is not null))
     or exists (select 1 from public.video_prompts vp where vp.is_active and not exists (
                  select 1 from public.video_resumes v
                  where v.prompt_id = vp.id and v.employee_id = v_uid)) then
    raise exception 'incomplete' using errcode = '22023';
  end if;

  update public.employee_profiles set status = 'submitted', onboarding_step = 6 where user_id = v_uid;
end;
$$;

-- 8.6 Employer: candidates, access logging, meetings ---------------------------------------------
-- Paginated (20 per page, no bulk export). Fields beyond the grant's scopes are null.
create function public.employer_list_candidates(p_page integer default 0)
returns table (
  employee_id   uuid,
  scopes        text[],
  expires_at    timestamptz,
  granted_at    timestamptz,
  headline      text,
  city_emirate  text,
  skills        text[],
  availability  public.availability[],
  test_score    numeric,
  total_count   bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_approved_employer() then return; end if;
  return query
    select g.employee_id, g.scopes, g.expires_at, g.created_at,
           p.headline, p.city_emirate, p.skills, p.availability,
           case when 'test' = any (g.scopes) then
             (select a.score from public.test_attempts a
               where a.employee_id = g.employee_id and a.submitted_at is not null
               order by a.submitted_at desc limit 1)
           end,
           count(*) over ()
      from public.access_grants g
      join public.employee_profiles p on p.user_id = g.employee_id
     where g.employer_id = (select auth.uid())
       and g.revoked_at is null
       and (g.expires_at is null or g.expires_at > now())
       and 'profile' = any (g.scopes)
       and p.status = 'approved'
     order by g.created_at desc
     limit 20 offset greatest(least(coalesce(p_page, 0), 500), 0) * 20;
end;
$$;

-- Called by the server action every time an employer opens a candidate or media.
create function public.log_candidate_access(p_employee_id uuid, p_scope text, p_ip_hash text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_active_grant(p_employee_id, p_scope) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform private.log_audit('candidate.viewed', 'employee', p_employee_id,
                            jsonb_build_object('scope', p_scope), p_ip_hash);
end;
$$;

create function public.respond_to_meeting_request(p_request_id uuid, p_accept boolean, p_slot smallint default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_slots integer;
begin
  select jsonb_array_length(proposed_slots) into v_slots from public.meeting_requests
   where id = p_request_id and employee_id = (select auth.uid()) and status = 'requested'
   for update;
  if v_slots is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  if p_accept and (p_slot is null or p_slot < 0 or p_slot >= v_slots) then
    raise exception 'invalid_slot' using errcode = '22023';
  end if;
  update public.meeting_requests
     set status = case when p_accept then 'accepted'::public.meeting_status
                       else 'declined'::public.meeting_status end,
         chosen_slot = case when p_accept then p_slot end,
         responded_at = now()
   where id = p_request_id;
end;
$$;

-- Employer: add/change the link on an accepted meeting, cancel, or mark completed.
create function public.employer_update_meeting_request(
  p_request_id uuid, p_status public.meeting_status default null, p_meeting_link text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_current public.meeting_status;
begin
  if not private.is_approved_employer() then raise exception 'forbidden' using errcode = '42501'; end if;
  select status into v_current from public.meeting_requests
   where id = p_request_id and employer_id = (select auth.uid())
   for update;
  if v_current is null then raise exception 'not_found' using errcode = 'P0002'; end if;

  if p_status is not null and not (
       (v_current in ('requested', 'accepted') and p_status = 'cancelled')
    or (v_current = 'accepted' and p_status = 'completed')) then
    raise exception 'invalid_transition' using errcode = '22023';
  end if;
  if p_meeting_link is not null and v_current <> 'accepted' then
    raise exception 'invalid_transition' using errcode = '22023';
  end if;

  update public.meeting_requests
     set status = coalesce(p_status, status),
         meeting_link = coalesce(p_meeting_link, meeting_link)
   where id = p_request_id;
end;
$$;

-- Employees see only the company name of employers who contacted them.
create function public.employee_list_meeting_requests()
returns table (
  id uuid, company_name text, proposed_slots jsonb, chosen_slot smallint,
  meeting_link text, status public.meeting_status, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.id, e.company_name, m.proposed_slots, m.chosen_slot,
         m.meeting_link, m.status, m.created_at
    from public.meeting_requests m
    join public.employer_profiles e on e.user_id = m.employer_id
   where m.employee_id = (select auth.uid())
   order by m.created_at desc
   limit 100;
$$;

-- 8.7 Rate limiting (fixed window; service_role only, key is an HMAC built server-side) ----
create function public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits   integer;
begin
  insert into private.rate_limits (key, window_start, hits)
  values (left(p_key, 200), v_window, 1)
  on conflict (key, window_start) do update set hits = private.rate_limits.hits + 1
  returning hits into v_hits;

  if random() < 0.01 then   -- opportunistic cleanup
    delete from private.rate_limits where window_start < now() - interval '1 day';
  end if;
  return v_hits <= p_max;
end;
$$;

-- -----------------------------------------------------------------------------
-- 9. Privileges (explicit allow-list; everything else stays revoked)
-- -----------------------------------------------------------------------------
revoke all on all tables    in schema public  from anon, authenticated;
revoke all on all functions in schema public  from anon, authenticated, public;
revoke all on all tables    in schema private from anon, authenticated, public;
revoke all on all functions in schema private from anon, authenticated, public;

-- audit_logs: even the service role cannot rewrite history.
revoke update, delete, truncate on public.audit_logs from service_role;

-- Policy helpers must be executable by the caller.
grant execute on function
  private.current_user_role(), private.is_admin(), private.is_mfa_admin(),
  private.is_approved_employer(), private.has_active_grant(uuid, text)
  to authenticated;

grant select on
  public.profiles, public.employee_profiles, public.employee_contacts, public.employer_profiles,
  public.surveys, public.survey_questions, public.survey_responses, public.survey_answers,
  public.tests, public.test_questions, public.test_attempts,
  public.video_prompts, public.video_resumes, public.cv_documents,
  public.access_grants, public.meeting_requests, public.consents, public.audit_logs
  to authenticated;
-- test_answer_keys: no grants at all.

grant update (full_name) on public.profiles to authenticated;
grant update (headline, city_emirate, languages, skills, availability, expected_pay_range, onboarding_step)
  on public.employee_profiles to authenticated;
grant update (phone, email, whatsapp) on public.employee_contacts to authenticated;
grant update (company_name, trade_license_no, contact_person, contact_phone, website)
  on public.employer_profiles to authenticated;

grant insert, update, delete on public.surveys, public.survey_questions, public.tests,
  public.test_questions, public.video_prompts to authenticated;  -- policies: admin only

grant insert (employee_id, survey_id) on public.survey_responses to authenticated;
grant insert (response_id, question_id, answer), update (answer) on public.survey_answers to authenticated;
grant delete on public.test_attempts to authenticated;          -- policy: admin only
grant insert (employee_id, prompt_id, storage_path, duration_seconds), delete
  on public.video_resumes to authenticated;
grant update (status) on public.video_resumes to authenticated; -- policy: admin only
grant insert (employee_id, storage_path, mime_type, size_bytes), delete
  on public.cv_documents to authenticated;
grant insert (employer_id, employee_id, proposed_slots) on public.meeting_requests to authenticated;
grant insert (user_id, type, version, ip_hash) on public.consents to authenticated;

grant execute on function
  public.admin_set_employer_status(uuid, public.employer_status),
  public.admin_set_employee_status(uuid, public.employee_status),
  public.admin_grant_access(uuid, uuid[], text[], timestamptz, text),
  public.admin_revoke_grant(uuid),
  public.admin_set_answer_key(uuid, smallint),
  public.admin_get_answer_keys(uuid),
  public.start_test_attempt(uuid),
  public.save_test_answer(uuid, uuid, smallint),
  public.submit_test_attempt(uuid),
  public.submit_survey_response(uuid),
  public.submit_employee_profile(),
  public.employer_list_candidates(integer),
  public.log_candidate_access(uuid, text, text),
  public.respond_to_meeting_request(uuid, boolean, smallint),
  public.employer_update_meeting_request(uuid, public.meeting_status, text),
  public.employee_list_meeting_requests()
  to authenticated;

grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

-- -----------------------------------------------------------------------------
-- 10. Storage: private buckets and object policies
-- -----------------------------------------------------------------------------
-- Note: Supabase's project-wide upload limit (50 MB on Free) caps the video
-- bucket limit below; raise it in Storage settings on a paid plan.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('cv-documents', 'cv-documents', false, 5242880,
   array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('video-resumes', 'video-resumes', false, 104857600,
   array['video/mp4', 'video/webm'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Employees: only inside their own "{uid}/" folder. No UPDATE, so no overwrites.
create policy "wemuste: employee uploads own files" on storage.objects
  for insert to authenticated with check (
    bucket_id in ('cv-documents', 'video-resumes')
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and private.current_user_role() = 'employee');
create policy "wemuste: employee reads own files" on storage.objects
  for select to authenticated using (
    bucket_id in ('cv-documents', 'video-resumes')
    and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "wemuste: employee deletes own files" on storage.objects
  for delete to authenticated using (
    bucket_id in ('cv-documents', 'video-resumes')
    and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Employers: only files registered to a granted, approved record. Signed URLs
-- (5 min) are created with the employer's own client, so these policies apply.
create policy "wemuste: employer reads granted videos" on storage.objects
  for select to authenticated using (
    bucket_id = 'video-resumes'
    and exists (select 1 from public.video_resumes v
                where v.storage_path = objects.name and v.provider = 'supabase'
                  and v.status = 'approved'
                  and private.has_active_grant(v.employee_id, 'video')));
create policy "wemuste: employer reads granted cvs" on storage.objects
  for select to authenticated using (
    bucket_id = 'cv-documents'
    and exists (select 1 from public.cv_documents c
                where c.storage_path = objects.name
                  and private.has_active_grant(c.employee_id, 'cv')));

create policy "wemuste: admin reads files" on storage.objects
  for select to authenticated using (
    bucket_id in ('cv-documents', 'video-resumes') and private.is_mfa_admin());
create policy "wemuste: admin deletes files" on storage.objects
  for delete to authenticated using (
    bucket_id in ('cv-documents', 'video-resumes') and private.is_mfa_admin());
