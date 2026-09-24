-- =============================================================================
-- v2 phase 3: jobs with only title, description and location
-- =============================================================================
-- Employers post a job with 3 fields; it is on the public map immediately.
-- The exact point is private; the public sees a pin rounded to ~300 m.
-- Anonymous visitors have no table access: only public.get_public_jobs().
-- =============================================================================

-- The v1 jobs table (pay, schedule, category, ...) is replaced. Only test data
-- existed; there are no applications pointing at it any more.
drop function if exists public.admin_set_job_status(uuid, public.job_status);
drop table if exists public.jobs;
drop type if exists public.job_status, public.job_category, public.pay_period, public.application_status;

create type public.job_status as enum ('published', 'hidden', 'closed', 'removed');

create table public.jobs (
  id             uuid primary key default gen_random_uuid(),
  employer_id    uuid not null references public.employer_profiles (user_id) on delete cascade,
  title          text not null check (char_length(title) between 3 and 120),
  description    text not null check (char_length(description) between 10 and 3000),
  -- Place name from the map search / reverse geocode, editable by the employer.
  location_label text not null check (char_length(location_label) between 2 and 200),
  -- Exact point the employer picked: never returned to the public.
  lat            double precision not null check (lat between -90 and 90),
  lng            double precision not null check (lng between -180 and 180),
  -- ~300 m grid cell shown on the public map. Set by trigger only.
  public_lat     double precision not null default 0,
  public_lng     double precision not null default 0,
  status         public.job_status not null default 'published',
  -- Question sets for applications, defaulted to the active ones; admin-only.
  test_id        uuid references public.tests (id) on delete set null,
  survey_id      uuid references public.surveys (id) on delete set null,
  published_at   timestamptz not null default now(),
  closed_at      timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index jobs_public_idx on public.jobs (public_lat, public_lng) where status = 'published';
create index jobs_employer_idx on public.jobs (employer_id, created_at desc);
create index jobs_status_idx on public.jobs (status, created_at desc);
create trigger set_updated_at before update on public.jobs
  for each row execute function private.set_updated_at();

create function private.jobs_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_step_lng double precision;
begin
  -- ~300 m grid: 0.0027° of latitude, and the same distance in longitude.
  v_step_lng := 0.0027 / greatest(cos(radians(new.lat)), 0.2);
  new.public_lat := round((round(new.lat / 0.0027) * 0.0027)::numeric, 5);
  new.public_lng := round((round(new.lng / v_step_lng) * v_step_lng)::numeric, 5);

  if tg_op = 'INSERT' then
    new.test_id   := coalesce(new.test_id, (select id from public.tests where is_active));
    new.survey_id := coalesce(new.survey_id, (select id from public.surveys where is_active));
    new.published_at := now();
    return new;
  end if;

  -- Employers (any caller with a JWT who isn't an MFA admin) may only close a
  -- published job, never re-publish, hide, remove or change question sets.
  if (select auth.uid()) is not null and not private.is_mfa_admin() then
    if new.status is distinct from old.status
       and not (old.status = 'published' and new.status = 'closed') then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    if new.test_id is distinct from old.test_id or new.survey_id is distinct from old.survey_id
       or new.employer_id is distinct from old.employer_id then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  end if;

  if new.status = 'closed' and old.status <> 'closed' then new.closed_at := now(); end if;
  if new.status = 'published' and old.status <> 'published' then new.closed_at := null; end if;
  return new;
end;
$$;
create trigger jobs_before_write before insert or update on public.jobs
  for each row execute function private.jobs_before_write();

alter table public.jobs enable row level security;
alter table public.jobs force row level security;

-- Employers: their own jobs, only while approved (suspended employers see nothing).
create policy "jobs: employer reads own" on public.jobs
  for select to authenticated using (employer_id = (select auth.uid()) and private.is_approved_employer());
create policy "jobs: employer posts" on public.jobs
  for insert to authenticated with check (
    employer_id = (select auth.uid()) and private.is_approved_employer() and status = 'published');
create policy "jobs: employer edits own" on public.jobs
  for update to authenticated
  using (employer_id = (select auth.uid()) and private.is_approved_employer() and status in ('published', 'closed'))
  with check (employer_id = (select auth.uid()) and status in ('published', 'closed'));
create policy "jobs: admin reads" on public.jobs
  for select to authenticated using (private.is_mfa_admin());
-- Admin status changes go through admin_set_job_status() (audited).

revoke all on public.jobs from anon, authenticated;
grant select on public.jobs to authenticated;
grant insert (employer_id, title, description, location_label, lat, lng) on public.jobs to authenticated;
grant update (title, description, location_label, lat, lng, status) on public.jobs to authenticated;

-- Admin moderation: hide, close, remove (soft delete) or restore any job.
create function public.admin_set_job_status(p_job_id uuid, p_status public.job_status)
returns void language plpgsql security definer set search_path = '' as $$
declare v_old public.job_status;
begin
  perform private.require_mfa_admin();
  select status into v_old from public.jobs where id = p_job_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if v_old = p_status then return; end if;
  update public.jobs set status = p_status where id = p_job_id;
  perform private.log_audit('job.status_changed', 'job', p_job_id,
                            jsonb_build_object('from', v_old, 'to', p_status));
end;
$$;

-- The only thing anonymous visitors can read: published jobs of approved
-- employers inside a bounding box, with the rounded pin. Max 500 rows.
create function public.get_public_jobs(
  min_lat double precision, min_lng double precision,
  max_lat double precision, max_lng double precision)
returns table (
  id uuid, title text, description text, location_label text,
  public_lat double precision, public_lng double precision, published_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select j.id, j.title, j.description, j.location_label, j.public_lat, j.public_lng, j.published_at
    from public.jobs j
    join public.employer_profiles e on e.user_id = j.employer_id
   where j.status = 'published'
     and e.status = 'approved'
     and j.public_lat between least(min_lat, max_lat) and greatest(min_lat, max_lat)
     and j.public_lng between least(min_lng, max_lng) and greatest(min_lng, max_lng)
   order by j.published_at desc
   limit 500;
$$;

revoke all on function
  public.admin_set_job_status(uuid, public.job_status),
  public.get_public_jobs(double precision, double precision, double precision, double precision),
  private.jobs_before_write()
  from public;
grant execute on function public.admin_set_job_status(uuid, public.job_status) to authenticated;
grant execute on function
  public.get_public_jobs(double precision, double precision, double precision, double precision)
  to anon, authenticated;
