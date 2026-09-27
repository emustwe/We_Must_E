-- =============================================================================
-- The public job list: up to 5,000 jobs (was 1,000)
-- =============================================================================
-- With the partner jobs in Pakistan, India and Bangladesh there are more than
-- 1,000 live jobs, and the newest-first cut-off would drop the older UAE jobs
-- from the map. Same function and columns; the limit is 5,000, and the order
-- has a tiebreaker (id), because the API returns at most 1,000 rows per
-- request and the app fetches the list in pages that must not overlap.
-- =============================================================================

create or replace function public.get_public_jobs(
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
   order by j.published_at desc, j.id
   limit 5000;
$$;
