-- =============================================================================
-- Wemuste: job map, job requests, admin-created employers
-- =============================================================================
-- Product changes (approved 2026-09-25):
--   * Employers can no longer sign up. An admin creates each employer account
--     (service role sets app_metadata.wemuste_role = 'employer', which users
--     cannot set themselves) and the employer must change the password on first login.
--   * Approved employers post jobs. Signed-in employees browse open jobs on a
--     map and send requests.
--   * A job's exact location is private. Employees see a pin offset by
--     250-600 m until their request is accepted.
--   * Sending a request shares a limited profile (profile, test, video scopes)
--     with that one employer. Accepting it also unlocks contact and CV.
--     Admin grants keep working alongside this.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Enums
-- -----------------------------------------------------------------------------
create type public.job_category as enum (
  'hospitality', 'retail', 'delivery', 'cleaning', 'construction',
  'office', 'tech', 'care', 'events', 'beauty', 'other');
create type public.pay_period as enum ('hour', 'day', 'week', 'month', 'fixed');
create type public.job_status as enum ('open', 'paused', 'closed', 'removed');
create type public.application_status as enum ('pending', 'accepted', 'declined', 'withdrawn');

-- -----------------------------------------------------------------------------
-- 2. Employers: admin-created only
-- -----------------------------------------------------------------------------
alter table public.employer_profiles
  add column contact_email text check (char_length(contact_email) <= 254),
  add column must_change_password boolean not null default false,
  add column created_by uuid references public.profiles (id) on delete set null;

-- Creates the profile rows for an admin-created employer.
create function private.provision_employer(p_user_id uuid, p_email text, p_app jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, role, full_name)
  values (p_user_id, 'employer', left(btrim(coalesce(p_app ->> 'contact_person', '')), 120))
  on conflict (id) do update set role = 'employer', full_name = excluded.full_name;

  insert into public.employer_profiles
    (user_id, company_name, trade_license_no, contact_person, contact_phone, website,
     contact_email, must_change_password, created_by)
  values (p_user_id,
          left(btrim(coalesce(p_app ->> 'company_name', '')), 160),
          nullif(left(btrim(coalesce(p_app ->> 'trade_license_no', '')), 64), ''),
          nullif(left(btrim(coalesce(p_app ->> 'contact_person', '')), 120), ''),
          nullif(left(btrim(coalesce(p_app ->> 'contact_phone', '')), 32), ''),
          nullif(left(btrim(coalesce(p_app ->> 'website', '')), 255), ''),
          left(p_email, 254),
          true,
          -- Only honoured if it points at a real admin.
          (select p.id from public.profiles p
            where p.id = nullif(p_app ->> 'created_by', '')::uuid and p.role = 'admin'));
  -- Starts pending; the admin action approves it through
  -- admin_set_employer_status() so approval is audited with the admin as actor.
end;
$$;

-- Replaces the Phase 1 trigger. The role now comes from raw_app_meta_data,
-- which only the service role can write; user_metadata can no longer make
-- anyone an employer. Admins are still never created here.
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_meta     jsonb := coalesce(new.raw_user_meta_data, '{}');
  v_consents jsonb := coalesce(v_meta -> 'consents', '{}');
  v_ip_hash  text  := left(v_meta ->> 'ip_hash', 128);
  v_type     public.consent_type;
begin
  if new.raw_app_meta_data ->> 'wemuste_role' = 'employer' then
    perform private.provision_employer(new.id, new.email, new.raw_app_meta_data);
    return new;
  end if;

  insert into public.profiles (id, role, full_name)
  values (new.id, 'employee', left(btrim(coalesce(v_meta ->> 'full_name', '')), 120));
  insert into public.employee_profiles (user_id) values (new.id);
  insert into public.employee_contacts (user_id, email) values (new.id, left(new.email, 254));

  foreach v_type in array enum_range(null::public.consent_type) loop
    if coalesce(v_consents ->> v_type::text, '') <> '' then
      insert into public.consents (user_id, type, version, ip_hash)
      values (new.id, v_type, left(v_consents ->> v_type::text, 32), v_ip_hash);
    end if;
  end loop;

  return new;
end;
$$;

-- The Auth admin API inserts the user first and writes app_metadata in a
-- separate UPDATE, so admin-created employers arrive here. Only brand-new,
-- untouched employee accounts are converted; an existing employee can never
-- be turned into an employer this way.
create function private.handle_app_metadata_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.raw_app_meta_data ->> 'wemuste_role' is distinct from 'employer'
     or old.raw_app_meta_data ->> 'wemuste_role' = 'employer' then
    return new;
  end if;
  if new.created_at < now() - interval '10 minutes'
     or not exists (select 1 from public.profiles where id = new.id and role = 'employee')
     or exists (select 1 from public.employer_profiles where user_id = new.id)
     or exists (select 1 from public.employee_profiles where user_id = new.id and status <> 'draft')
     or exists (select 1 from public.job_applications where employee_id = new.id)
     or exists (select 1 from public.survey_responses where employee_id = new.id)
     or exists (select 1 from public.test_attempts where employee_id = new.id)
     or exists (select 1 from public.video_resumes where employee_id = new.id) then
    return new;
  end if;

  delete from public.consents where user_id = new.id;
  delete from public.employee_profiles where user_id = new.id;  -- cascades contacts
  perform private.provision_employer(new.id, new.email, new.raw_app_meta_data);
  return new;
end;
$$;

create trigger on_auth_user_app_metadata_changed
  after update of raw_app_meta_data on auth.users
  for each row execute function private.handle_app_metadata_change();

-- Clears the first-login flag after the employer has set their own password.
create function public.complete_password_change()
returns void language sql security definer set search_path = '' as $$
  update public.employer_profiles set must_change_password = false
   where user_id = (select auth.uid()) and must_change_password;
$$;

-- -----------------------------------------------------------------------------
-- 3. Location fuzzing secret
-- -----------------------------------------------------------------------------
-- The public pin offset is derived from a secret, so the same location always
-- gets the same pin (no averaging attack across edits or jobs) and the offset
-- cannot be reversed by brute force.
create table private.settings (
  key    text primary key,
  value  text not null
);
alter table private.settings enable row level security;
alter table private.settings force row level security;
insert into private.settings (key, value)
values ('location_fuzz_secret', encode(extensions.gen_random_bytes(32), 'hex'));

-- -----------------------------------------------------------------------------
-- 4. Jobs
-- -----------------------------------------------------------------------------
create table public.jobs (
  id            uuid primary key default gen_random_uuid(),
  employer_id   uuid not null references public.employer_profiles (user_id) on delete cascade,
  title         text not null check (char_length(title) between 3 and 120),
  description   text not null check (char_length(description) between 10 and 2000),
  category      public.job_category not null,
  schedule      public.availability[] not null check (cardinality(schedule) between 1 and 5),
  pay_min       numeric(10,2) not null check (pay_min >= 0),
  pay_max       numeric(10,2) check (pay_max is null or pay_max >= pay_min),
  pay_period    public.pay_period not null,
  currency      text not null default 'AED' check (currency ~ '^[A-Z]{3}$'),
  spots         smallint not null default 1 check (spots between 1 and 100),
  city_emirate  text not null check (char_length(city_emirate) between 2 and 80),
  -- Neighbourhood shown to employees, e.g. "Dubai Marina".
  area_label    text not null check (char_length(area_label) between 2 and 80),
  -- Exact location: owner, admin, and employees whose request was accepted.
  address       text check (char_length(address) <= 300),
  lat           double precision not null check (lat between -90 and 90),
  lng           double precision not null check (lng between -180 and 180),
  -- Offset pin shown on the map. Set by trigger, never by clients.
  public_lat    double precision not null default 0,
  public_lng    double precision not null default 0,
  starts_on     date,
  status        public.job_status not null default 'open',
  expires_at    timestamptz not null default (now() + interval '30 days'),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (expires_at <= created_at + interval '91 days')
);
create index jobs_employer_idx on public.jobs (employer_id, created_at desc);
create index jobs_open_idx on public.jobs (public_lat, public_lng) where status = 'open';
create trigger set_updated_at before update on public.jobs
  for each row execute function private.set_updated_at();

create function private.fuzz_job_location()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_hash     text;
  v_distance double precision;
  v_angle    double precision;
begin
  if tg_op = 'UPDATE' and new.lat = old.lat and new.lng = old.lng then
    new.public_lat := old.public_lat;
    new.public_lng := old.public_lng;
    return new;
  end if;

  v_hash := md5((select value from private.settings where key = 'location_fuzz_secret')
                || ':' || round(new.lat::numeric, 4) || ',' || round(new.lng::numeric, 4));
  v_distance := 250 + 350 * (('x' || substr(v_hash, 1, 8))::bit(32)::bigint / 4294967295.0);
  v_angle    := 2 * pi() * (('x' || substr(v_hash, 9, 8))::bit(32)::bigint / 4294967295.0);

  new.public_lat := round((new.lat + v_distance * cos(v_angle) / 111320.0)::numeric, 5);
  new.public_lng := round((new.lng + v_distance * sin(v_angle)
                     / (111320.0 * greatest(cos(radians(new.lat)), 0.01)))::numeric, 5);
  return new;
end;
$$;
create trigger fuzz_location before insert or update on public.jobs
  for each row execute function private.fuzz_job_location();

-- -----------------------------------------------------------------------------
-- 5. Job requests
-- -----------------------------------------------------------------------------
create table public.job_applications (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid not null references public.jobs (id) on delete cascade,
  employee_id   uuid not null references public.employee_profiles (user_id) on delete cascade,
  -- Copied from the job so RLS and indexes don't need a join.
  employer_id   uuid not null references public.employer_profiles (user_id) on delete cascade,
  message       text check (char_length(message) <= 500),
  status        public.application_status not null default 'pending',
  responded_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (job_id, employee_id)
);
create index job_applications_employer_idx on public.job_applications (employer_id, status);
create index job_applications_employee_idx on public.job_applications (employee_id, created_at desc);
create trigger set_updated_at before update on public.job_applications
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- 6. Access: admin grants OR the employee's own job request
-- -----------------------------------------------------------------------------
create function private.has_application_access(p_employee_id uuid, p_scope text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.job_applications a
    join public.employer_profiles e on e.user_id = a.employer_id
    join public.employee_profiles p on p.user_id = a.employee_id
    where a.employer_id = (select auth.uid())
      and a.employee_id = p_employee_id
      and e.status = 'approved'
      and p.status in ('submitted', 'approved')
      and (   (a.status in ('pending', 'accepted') and p_scope in ('profile', 'test', 'video'))
           or (a.status = 'accepted' and p_scope in ('contact', 'cv')))
  );
$$;

-- Same signature, so every existing policy that calls it (tables and storage)
-- picks up request-based access without being recreated.
create or replace function private.has_active_grant(p_employee_id uuid, p_scope text)
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
      and p.status = 'approved'
  ) or private.has_application_access(p_employee_id, p_scope);
$$;

-- -----------------------------------------------------------------------------
-- 7. RLS
-- -----------------------------------------------------------------------------
alter table public.jobs enable row level security;
alter table public.jobs force row level security;
alter table public.job_applications enable row level security;
alter table public.job_applications force row level security;

-- Employees never read public.jobs directly (it holds the exact location);
-- they use list_open_jobs() / get_job(), which return the offset pin.
create policy "jobs: employer reads own" on public.jobs
  for select to authenticated using (employer_id = (select auth.uid()));
create policy "jobs: admin reads all" on public.jobs
  for select to authenticated using (private.is_mfa_admin());
create policy "jobs: approved employer posts" on public.jobs
  for insert to authenticated with check (
    employer_id = (select auth.uid())
    and private.is_approved_employer()
    and status in ('open', 'paused'));
-- Employers can edit, pause, reopen and close, but not undo an admin removal.
create policy "jobs: approved employer edits own" on public.jobs
  for update to authenticated
  using (employer_id = (select auth.uid()) and status <> 'removed' and private.is_approved_employer())
  with check (employer_id = (select auth.uid()) and status <> 'removed');

create policy "job_applications: employee reads own" on public.job_applications
  for select to authenticated using (employee_id = (select auth.uid()));
create policy "job_applications: employer reads own" on public.job_applications
  for select to authenticated using (
    employer_id = (select auth.uid()) and private.is_approved_employer());
create policy "job_applications: admin reads all" on public.job_applications
  for select to authenticated using (private.is_mfa_admin());
-- All writes go through the RPCs below.

-- -----------------------------------------------------------------------------
-- 8. RPCs
-- -----------------------------------------------------------------------------

-- Map: open jobs inside a bounding box, offset pins only. Max 300 rows.
create function public.list_open_jobs(
  p_south double precision default null, p_west double precision default null,
  p_north double precision default null, p_east double precision default null)
returns table (
  id uuid, title text, category public.job_category, schedule public.availability[],
  pay_min numeric, pay_max numeric, pay_period public.pay_period, currency text,
  spots smallint, city_emirate text, area_label text, lat double precision,
  lng double precision, starts_on date, company_name text, created_at timestamptz,
  my_request_status public.application_status)
language plpgsql stable security definer set search_path = '' as $$
begin
  if private.current_user_role() is distinct from 'employee' and not private.is_mfa_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select j.id, j.title, j.category, j.schedule, j.pay_min, j.pay_max, j.pay_period,
           j.currency, j.spots, j.city_emirate, j.area_label, j.public_lat, j.public_lng,
           j.starts_on, e.company_name, j.created_at,
           (select a.status from public.job_applications a
             where a.job_id = j.id and a.employee_id = (select auth.uid()))
      from public.jobs j
      join public.employer_profiles e on e.user_id = j.employer_id
     where j.status = 'open'
       and j.expires_at > now()
       and e.status = 'approved'
       and (p_south is null or j.public_lat between p_south and p_north)
       and (p_west  is null or j.public_lng between p_west and p_east)
     order by j.created_at desc
     limit 300;
end;
$$;

-- Job detail for an employee. The exact address and location are returned
-- only when this employee's request was accepted.
create function public.get_job(p_job_id uuid)
returns table (
  id uuid, title text, description text, category public.job_category,
  schedule public.availability[], pay_min numeric, pay_max numeric,
  pay_period public.pay_period, currency text, spots smallint, city_emirate text,
  area_label text, lat double precision, lng double precision, starts_on date,
  expires_at timestamptz, company_name text, my_request_id uuid,
  my_request_status public.application_status, exact_address text,
  exact_lat double precision, exact_lng double precision)
language plpgsql stable security definer set search_path = '' as $$
begin
  if private.current_user_role() is distinct from 'employee' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select j.id, j.title, j.description, j.category, j.schedule, j.pay_min, j.pay_max,
           j.pay_period, j.currency, j.spots, j.city_emirate, j.area_label,
           j.public_lat, j.public_lng, j.starts_on, j.expires_at, e.company_name,
           a.id, a.status,
           case when a.status = 'accepted' then j.address end,
           case when a.status = 'accepted' then j.lat end,
           case when a.status = 'accepted' then j.lng end
      from public.jobs j
      join public.employer_profiles e on e.user_id = j.employer_id
      left join public.job_applications a
        on a.job_id = j.id and a.employee_id = (select auth.uid())
     where j.id = p_job_id
       and e.status = 'approved'
       -- Closed jobs stay visible to people who already requested them.
       and ((j.status = 'open' and j.expires_at > now()) or a.id is not null)
       and j.status <> 'removed';
end;
$$;

create function public.request_job(p_job_id uuid, p_message text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid       uuid := (select auth.uid());
  v_employer  uuid;
  v_existing  public.job_applications;
  v_id        uuid;
begin
  if private.current_user_role() is distinct from 'employee' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from public.employee_profiles
                 where user_id = v_uid and status in ('submitted', 'approved')) then
    raise exception 'profile_incomplete' using errcode = '22023';
  end if;

  select j.employer_id into v_employer
    from public.jobs j join public.employer_profiles e on e.user_id = j.employer_id
   where j.id = p_job_id and j.status = 'open' and j.expires_at > now() and e.status = 'approved';
  if v_employer is null then raise exception 'not_found' using errcode = 'P0002'; end if;

  if (select count(*) from public.job_applications
       where employee_id = v_uid and status = 'pending') >= 20 then
    raise exception 'too_many_pending' using errcode = '22023';
  end if;

  select * into v_existing from public.job_applications
   where job_id = p_job_id and employee_id = v_uid for update;
  if found then
    if v_existing.status <> 'withdrawn' then
      raise exception 'already_requested' using errcode = '22023';
    end if;
    update public.job_applications
       set status = 'pending', message = left(p_message, 500), responded_at = null
     where id = v_existing.id;
    return v_existing.id;
  end if;

  insert into public.job_applications (job_id, employee_id, employer_id, message)
  values (p_job_id, v_uid, v_employer, left(p_message, 500))
  returning id into v_id;
  return v_id;
end;
$$;

create function public.withdraw_job_request(p_application_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.job_applications
     set status = 'withdrawn', responded_at = now()
   where id = p_application_id and employee_id = (select auth.uid())
     and status in ('pending', 'accepted');
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
end;
$$;

create function public.employer_respond_to_application(p_application_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_employee uuid;
begin
  if not private.is_approved_employer() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.job_applications
     set status = case when p_accept then 'accepted'::public.application_status
                       else 'declined'::public.application_status end,
         responded_at = now()
   where id = p_application_id and employer_id = (select auth.uid()) and status = 'pending'
  returning employee_id into v_employee;
  if v_employee is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  perform private.log_audit(
    case when p_accept then 'application.accepted' else 'application.declined' end,
    'job_application', p_application_id, jsonb_build_object('employee_id', v_employee));
end;
$$;

-- Applicants for one of the employer's jobs, as a limited DTO. Name and contact
-- details only after acceptance.
create function public.employer_list_applications(p_job_id uuid)
returns table (
  id uuid, status public.application_status, message text, created_at timestamptz,
  employee_id uuid, headline text, city_emirate text, languages text[], skills text[],
  availability public.availability[], test_score numeric, video_count bigint,
  full_name text, phone text, email text, whatsapp text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_approved_employer()
     or not exists (select 1 from public.jobs j
                    where j.id = p_job_id and j.employer_id = (select auth.uid())) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select a.id, a.status, a.message, a.created_at, a.employee_id,
           p.headline, p.city_emirate, p.languages, p.skills, p.availability,
           (select t.score from public.test_attempts t
             where t.employee_id = a.employee_id and t.submitted_at is not null
             order by t.submitted_at desc limit 1),
           (select count(*) from public.video_resumes v
             where v.employee_id = a.employee_id and v.status = 'approved'),
           case when a.status = 'accepted' then pr.full_name end,
           case when a.status = 'accepted' then c.phone end,
           case when a.status = 'accepted' then c.email end,
           case when a.status = 'accepted' then c.whatsapp end
      from public.job_applications a
      join public.employee_profiles p on p.user_id = a.employee_id
      join public.profiles pr on pr.id = a.employee_id
      left join public.employee_contacts c on c.user_id = a.employee_id
     where a.job_id = p_job_id
       and a.status in ('pending', 'accepted', 'declined')
       and p.status in ('submitted', 'approved')
     order by (a.status = 'pending') desc, a.created_at desc
     limit 200;
end;
$$;

-- Employee's own requests with job and company.
create function public.employee_list_job_requests()
returns table (
  id uuid, status public.application_status, created_at timestamptz,
  responded_at timestamptz, job_id uuid, title text, category public.job_category,
  area_label text, city_emirate text, company_name text, job_status public.job_status)
language sql stable security definer set search_path = '' as $$
  select a.id, a.status, a.created_at, a.responded_at, j.id, j.title, j.category,
         j.area_label, j.city_emirate, e.company_name, j.status
    from public.job_applications a
    join public.jobs j on j.id = a.job_id
    join public.employer_profiles e on e.user_id = a.employer_id
   where a.employee_id = (select auth.uid())
   order by a.created_at desc
   limit 100;
$$;

-- Admin moderation: remove or restore a job.
create function public.admin_set_job_status(p_job_id uuid, p_status public.job_status)
returns void language plpgsql security definer set search_path = '' as $$
declare v_old public.job_status;
begin
  perform private.require_mfa_admin();
  select status into v_old from public.jobs where id = p_job_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  update public.jobs set status = p_status where id = p_job_id;
  perform private.log_audit('job.status_changed', 'job', p_job_id,
                            jsonb_build_object('from', v_old, 'to', p_status));
end;
$$;

-- -----------------------------------------------------------------------------
-- 9. Privileges
-- -----------------------------------------------------------------------------
revoke all on public.jobs, public.job_applications from anon, authenticated;
revoke all on private.settings from anon, authenticated, public;

grant select on public.jobs, public.job_applications to authenticated;
grant insert (employer_id, title, description, category, schedule, pay_min, pay_max, pay_period,
              currency, spots, city_emirate, area_label, address, lat, lng, starts_on, status,
              expires_at)
  on public.jobs to authenticated;
grant update (title, description, category, schedule, pay_min, pay_max, pay_period, currency,
              spots, city_emirate, area_label, address, lat, lng, starts_on, status, expires_at)
  on public.jobs to authenticated;
-- Employers may edit contact details only; the admin owns company identity now.
revoke update (company_name, trade_license_no) on public.employer_profiles from authenticated;

revoke all on function
  private.fuzz_job_location(), private.has_application_access(uuid, text),
  private.provision_employer(uuid, text, jsonb), private.handle_app_metadata_change()
  from public, anon, authenticated;
grant execute on function private.has_application_access(uuid, text) to authenticated;

revoke all on function
  public.complete_password_change(),
  public.list_open_jobs(double precision, double precision, double precision, double precision),
  public.get_job(uuid),
  public.request_job(uuid, text),
  public.withdraw_job_request(uuid),
  public.employer_respond_to_application(uuid, boolean),
  public.employer_list_applications(uuid),
  public.employee_list_job_requests(),
  public.admin_set_job_status(uuid, public.job_status)
  from public, anon;
grant execute on function
  public.complete_password_change(),
  public.list_open_jobs(double precision, double precision, double precision, double precision),
  public.get_job(uuid),
  public.request_job(uuid, text),
  public.withdraw_job_request(uuid),
  public.employer_respond_to_application(uuid, boolean),
  public.employer_list_applications(uuid),
  public.employee_list_job_requests(),
  public.admin_set_job_status(uuid, public.job_status)
  to authenticated;
