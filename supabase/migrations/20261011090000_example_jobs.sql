-- =============================================================================
-- Example jobs
-- =============================================================================
-- Some listings only show what a job on Wemuste looks like. The map shows them
-- clearly as examples, and nobody can apply to them (so no one sends personal
-- data for a job that does not exist). Only the database (or an admin through
-- SQL) sets the flag: sponsors have no column grant for it.
-- =============================================================================

alter table public.jobs add column is_example boolean not null default false;

-- The public list now says which jobs are examples.
drop function public.get_public_jobs(double precision, double precision, double precision, double precision);
create function public.get_public_jobs(
  min_lat double precision, min_lng double precision,
  max_lat double precision, max_lng double precision)
returns table (
  id uuid, title text, description text, location_label text,
  public_lat double precision, public_lng double precision, published_at timestamptz,
  sponsor_name text, sponsor_logo text, country_code text, country_name text, city text,
  is_example boolean)
language sql stable security definer set search_path = '' as $$
  select j.id, j.title, j.description, j.location_label, j.public_lat, j.public_lng, j.published_at,
         coalesce(j.display_company, e.company_name),
         case when j.display_company is null then e.logo_path end,
         j.country_code, j.country_name, j.city, j.is_example
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

-- Applications can't start on an example job.
create or replace function public.app_start(p_job_id uuid, p_token_hash text, p_ip_hash text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v public.applications; v_job public.jobs;
begin
  select j.* into v_job from public.jobs j
    join public.employer_profiles e on e.user_id = j.employer_id
   where j.id = p_job_id and j.status = 'published' and e.status = 'approved' and not j.is_example;
  if not found then raise exception 'job_unavailable' using errcode = 'P0002'; end if;
  if p_token_hash is null or char_length(p_token_hash) < 32 then
    raise exception 'invalid_token' using errcode = '28000';
  end if;

  insert into public.applications (job_id, test_id, video_set_id, survey_id, draft_token_hash, ip_hash)
  values (p_job_id,
          coalesce(v_job.test_id, (select id from public.tests where is_active)),
          coalesce(v_job.video_set_id, (select id from public.video_question_sets where is_active)),
          coalesce(v_job.survey_id, (select id from public.surveys where is_active)),
          p_token_hash, left(p_ip_hash, 128))
  returning * into v;
  update public.applications set current_step = private.app_next_step(v, 'test') where id = v.id;
  return v.id;
end;
$$;
