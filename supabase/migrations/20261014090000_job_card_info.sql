-- =============================================================================
-- Job card: job type and the real number of applicants; no company names
-- =============================================================================
-- 1. Every job has a type: full-time, part-time, or short-term (1-3 days).
--    Sponsors choose it when posting; changing it sends a live job back to
--    review like any other change.
-- 2. The public list says how many people have applied (sent applications
--    only, never unfinished ones), and no longer includes the sponsor's name
--    or logo: the public card doesn't show a company.
-- =============================================================================

create type public.job_type as enum ('full_time', 'part_time', 'short_term');
alter table public.jobs add column job_type public.job_type not null default 'full_time';
grant insert (job_type), update (job_type) on public.jobs to authenticated;

drop function public.get_public_jobs(double precision, double precision, double precision, double precision);
create function public.get_public_jobs(
  min_lat double precision, min_lng double precision,
  max_lat double precision, max_lng double precision)
returns table (
  id uuid, title text, description text, location_label text,
  public_lat double precision, public_lng double precision, published_at timestamptz,
  country_code text, country_name text, city text,
  is_example boolean, job_type public.job_type, applicant_count integer)
language sql stable security definer set search_path = '' as $$
  select j.id, j.title, j.description, j.location_label, j.public_lat, j.public_lng, j.published_at,
         j.country_code, j.country_name, j.city, j.is_example, j.job_type,
         (select count(*)::integer from public.applications a
           where a.job_id = j.id and a.status <> 'in_progress')
    from public.jobs j
    join public.employer_profiles e on e.user_id = j.employer_id
   where j.status = 'published'
     and e.status = 'approved'
     and j.public_lat between least(min_lat, max_lat) and greatest(min_lat, max_lat)
     and j.public_lng between least(min_lng, max_lng) and greatest(min_lng, max_lng)
   order by j.published_at desc
   limit 1000;
$$;
revoke all on function public.get_public_jobs(double precision, double precision, double precision, double precision) from public;
grant execute on function public.get_public_jobs(double precision, double precision, double precision, double precision)
  to anon, authenticated;
