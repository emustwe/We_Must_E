-- =============================================================================
-- Sponsors (shown as "Sponsor" in the app; tables keep the "employer" name),
-- logos, worldwide job locations with country and city, phone video formats
-- =============================================================================

-- 1. Sponsor logos --------------------------------------------------------------
-- Public images (they appear on the public map). Uploaded only by the server
-- after checking the file, so there are no client write policies.
alter table public.employer_profiles
  add column logo_path text check (char_length(logo_path) <= 300);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sponsor-logos', 'sponsor-logos', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2. Jobs anywhere in the world, filterable by country and city ------------------
alter table public.jobs
  add column country_code text check (country_code ~ '^[A-Z]{2}$'),
  add column country_name text check (char_length(country_name) between 2 and 80),
  add column city text check (char_length(city) between 1 and 120);
create index jobs_country_city_idx on public.jobs (country_code, city) where status = 'published';

grant insert (country_code, country_name, city), update (country_code, country_name, city)
  on public.jobs to authenticated;

-- The public map now shows who posts each job: sponsor name and logo, plus the
-- job's country and city. Still never the exact point or any account ids.
drop function public.get_public_jobs(double precision, double precision, double precision, double precision);
create function public.get_public_jobs(
  min_lat double precision, min_lng double precision,
  max_lat double precision, max_lng double precision)
returns table (
  id uuid, title text, description text, location_label text,
  public_lat double precision, public_lng double precision, published_at timestamptz,
  sponsor_name text, sponsor_logo text, country_code text, country_name text, city text)
language sql stable security definer set search_path = '' as $$
  select j.id, j.title, j.description, j.location_label, j.public_lat, j.public_lng, j.published_at,
         e.company_name, e.logo_path, j.country_code, j.country_name, j.city
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

-- 3. Videos picked from the phone: iPhones save .mov (QuickTime) ------------------
alter table public.application_videos drop constraint application_videos_mime_type_check;
alter table public.application_videos add constraint application_videos_mime_type_check
  check (mime_type in ('video/webm', 'video/mp4', 'video/quicktime'));
update storage.buckets set allowed_mime_types = array['video/webm', 'video/mp4', 'video/quicktime']
 where id = 'application-videos';

create or replace function public.app_record_video(
  p_job_id uuid, p_token_hash text, p_question_id uuid, p_storage_path text,
  p_duration_seconds integer, p_size_bytes integer, p_mime_type text)
returns text language plpgsql security definer set search_path = '' as $$
declare v public.applications; v_max integer; v_old text;
begin
  v := private.app_for_token(p_job_id, p_token_hash);
  if v.current_step <> 'video' then raise exception 'wrong_step' using errcode = '22023'; end if;
  select max_seconds into v_max from public.video_questions
   where id = p_question_id and set_id = v.video_set_id and is_active;
  if v_max is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  if p_storage_path not like v.id || '/' || p_question_id || '/%'
     or p_duration_seconds > v_max + 5 then
    raise exception 'invalid_video' using errcode = '22023';
  end if;
  select storage_path into v_old from public.application_videos
   where application_id = v.id and question_id = p_question_id;
  insert into public.application_videos (application_id, question_id, storage_path, duration_seconds, size_bytes, mime_type)
  values (v.id, p_question_id, p_storage_path, greatest(p_duration_seconds, 1), p_size_bytes, p_mime_type)
  on conflict (application_id, question_id) do update set
    storage_path = excluded.storage_path, duration_seconds = excluded.duration_seconds,
    size_bytes = excluded.size_bytes, mime_type = excluded.mime_type, uploaded_at = now();
  return v_old;
end;
$$;

-- 4. Audit entries for sponsor changes the server makes with the service role ----
-- (logo uploads, password changes, deletion). Called with the acting user's
-- session first, so the log names who did it. No personal data in the entry.
create function public.log_sponsor_change(p_employer_id uuid, p_change text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_change not in ('logo', 'password', 'deleted') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  -- Admins (MFA) may do all three; a sponsor only changes their own logo.
  if not (private.is_mfa_admin()
          or (p_change = 'logo' and p_employer_id = (select auth.uid()) and private.is_approved_employer())) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from public.employer_profiles where user_id = p_employer_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  perform private.log_audit('sponsor.' || p_change, 'employer', p_employer_id);
end;
$$;
revoke all on function public.log_sponsor_change(uuid, text) from public, anon;
grant execute on function public.log_sponsor_change(uuid, text) to authenticated;

-- 5. The server's own writes (service role) run table triggers that live in
-- the private schema (updated_at, the company-details guard). The service role
-- already bypasses RLS, so this only lets those triggers run for it.
grant usage on schema private to service_role;
