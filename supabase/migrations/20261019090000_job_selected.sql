-- =============================================================================
-- A job turns green when the sponsor selects someone
-- =============================================================================
-- The first time a sponsor opens a candidate's contact details on a job, the
-- job is "selected": it stays on the map for one more month, shown green
-- ("someone has been selected"), and nobody can apply any more (new
-- applications and unfinished ones are refused). After that month the
-- nightly job closes it, which sends the usual "position filled" email and
-- deletes the applications as for any closed job.
-- =============================================================================

alter table public.jobs add column selected_at timestamptz;
create index jobs_selected_idx on public.jobs (selected_at) where selected_at is not null;

-- selected_at is set by the database only: it is not content, so it never
-- sends a live job back to review.
create or replace function private.jobs_before_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_cell_lat double precision; v_step_lng double precision;
  v_admin boolean := private.is_mfa_admin();
  -- Columns only the database or an admin sets; everything else is content.
  v_system text[] := array['status', 'updated_at', 'created_at', 'published_at', 'closed_at',
                           'public_lat', 'public_lng', 'review_note', 'reviewed_by', 'reviewed_at',
                           'selected_at'];
begin
  -- ~300 m grid: 0.0027° of latitude, and the same distance in longitude. The
  -- longitude step depends only on the grid cell, never on the exact point.
  v_cell_lat := round(new.lat / 0.0027) * 0.0027;
  v_step_lng := 0.0027 / greatest(cos(radians(v_cell_lat)), 0.2);
  new.public_lat := round(v_cell_lat::numeric, 5);
  new.public_lng := round((round(new.lng / v_step_lng) * v_step_lng)::numeric, 5);

  if tg_op = 'INSERT' then
    new.test_id      := coalesce(new.test_id, (select id from public.tests where is_active));
    new.video_set_id := coalesce(new.video_set_id, (select id from public.video_question_sets where is_active));
    new.survey_id    := coalesce(new.survey_id, (select id from public.surveys where is_active));
    if (select auth.uid()) is not null and not v_admin then
      -- Sponsors' jobs always start in review, and at most 20 a day.
      new.status := 'pending';
      if (select count(*) from public.jobs
           where employer_id = new.employer_id and created_at > now() - interval '1 day') >= 20 then
        raise exception 'rate_limited' using errcode = '54000';
      end if;
    end if;
    new.published_at := case when new.status = 'published' then now() end;
    return new;
  end if;

  if (select auth.uid()) is not null and not v_admin then
    -- Sponsors: only close a live job; never publish, hide, remove or
    -- change question sets.
    if new.status is distinct from old.status
       and not (old.status = 'published' and new.status = 'closed') then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    if new.test_id is distinct from old.test_id or new.survey_id is distinct from old.survey_id
       or new.video_set_id is distinct from old.video_set_id
       or new.employer_id is distinct from old.employer_id then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    -- Any content change (every column, including ones added later) sends a
    -- live or rejected job back to review.
    if old.status in ('published', 'rejected') and new.status = old.status
       and (to_jsonb(new) - v_system) is distinct from (to_jsonb(old) - v_system) then
      new.status := 'pending';
      new.review_note := null;
    end if;
  end if;

  if new.status = 'published' and old.status <> 'published' then
    new.published_at := now();
    new.closed_at := null;
  end if;
  if new.status = 'closed' and old.status <> 'closed' then new.closed_at := now(); end if;
  return new;
end;
$function$;

create or replace function public.sponsor_unlock_candidate(p_application_id uuid, p_expected_price integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_balance integer;
  v_job uuid;
  v_price integer;
  v_counted integer := 0;
begin
  if not private.employer_owns_approved(p_application_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  -- One payment at a time per sponsor.
  select ecoin_balance into v_balance from public.employer_profiles where user_id = v_uid for update;
  if exists (select 1 from public.candidate_unlocks where application_id = p_application_id) then
    return v_balance; -- already open: no charge
  end if;
  select job_id into v_job from public.applications where id = p_application_id;

  if exists (select 1 from public.candidate_counted where application_id = p_application_id) then
    v_price := 1;
  else
    -- Count every approved candidate of the job not yet counted (this one too).
    insert into public.candidate_counted (application_id, employer_id)
    select a.id, v_uid
      from public.applications a
     where a.job_id = v_job and a.status = 'approved'
       and not exists (select 1 from public.candidate_counted c where c.application_id = a.id);
    get diagnostics v_counted = row_count;
    v_price := v_counted;
  end if;

  if v_price <> p_expected_price then
    raise exception 'price_changed' using errcode = '22023';
  end if;
  if v_balance < v_price then
    raise exception 'no_coins' using errcode = '22023';
  end if;

  update public.employer_profiles set ecoin_balance = ecoin_balance - v_price where user_id = v_uid
  returning ecoin_balance into v_balance;
  insert into public.candidate_unlocks (application_id, employer_id) values (p_application_id, v_uid);
  -- The first contact opened on a job: someone was selected (green on the map).
  update public.jobs set selected_at = now() where id = v_job and selected_at is null;
  insert into public.ecoin_ledger (employer_id, delta, reason, application_id, note, created_by)
  values (v_uid, -v_price, 'unlock', p_application_id,
          case when v_counted > 1 then format('%s candidates counted', v_counted) end, v_uid);
  perform private.log_audit('candidate.unlocked', 'application', p_application_id,
                            jsonb_build_object('price', v_price, 'counted', v_counted));
  return v_balance;
end;
$$;

-- No new applications for a selected job.
create or replace function public.app_start(p_job_id uuid, p_token_hash text, p_ip_hash text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v public.applications; v_job public.jobs;
begin
  select j.* into v_job from public.jobs j
    join public.employer_profiles e on e.user_id = j.employer_id
   where j.id = p_job_id and j.status = 'published' and e.status = 'approved' and not j.is_example;
  if not found then raise exception 'job_unavailable' using errcode = 'P0002'; end if;
  if v_job.selected_at is not null then raise exception 'job_filled' using errcode = '22023'; end if;
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

-- Every later step of an unfinished application: refused once the job is selected.
create or replace function private.app_for_token(p_job_id uuid, p_token_hash text)
returns public.applications language plpgsql security definer set search_path = '' as $$
declare v public.applications;
begin
  select * into v from public.applications
   where job_id = p_job_id and draft_token_hash = p_token_hash
     and status = 'in_progress' and draft_expires_at > now()
   for update;
  if not found then raise exception 'invalid_token' using errcode = '28000'; end if;
  if exists (select 1 from public.jobs where id = p_job_id and selected_at is not null) then
    raise exception 'job_filled' using errcode = '22023';
  end if;
  return v;
end;
$$;

-- The public list says when a job was selected (the map shows it green).
drop function public.get_public_jobs(double precision, double precision, double precision, double precision);
create function public.get_public_jobs(
  min_lat double precision, min_lng double precision,
  max_lat double precision, max_lng double precision)
returns table (
  id uuid, title text, description text, location_label text,
  public_lat double precision, public_lng double precision, published_at timestamptz,
  country_code text, country_name text, city text,
  is_example boolean, job_type public.job_type, applicant_count integer, selected_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select j.id, j.title, j.description, j.location_label, j.public_lat, j.public_lng, j.published_at,
         j.country_code, j.country_name, j.city, j.is_example, j.job_type,
         (select count(*)::integer from public.applications a
           where a.job_id = j.id and a.status <> 'in_progress'),
         j.selected_at
    from public.jobs j
    join public.employer_profiles e on e.user_id = j.employer_id
   where j.status = 'published'
     and e.status = 'approved'
     and j.public_lat between least(min_lat, max_lat) and greatest(min_lat, max_lat)
     and j.public_lng between least(min_lng, max_lng) and greatest(min_lng, max_lng)
   order by j.published_at desc, j.id
   limit 5000;
$$;
revoke all on function public.get_public_jobs(double precision, double precision, double precision, double precision) from public;
grant execute on function public.get_public_jobs(double precision, double precision, double precision, double precision)
  to anon, authenticated;

-- The nightly job: selected jobs close one month after the selection
-- (server only). Returns the closed jobs, to email their applicants.
create function public.app_close_selected_jobs(p_days integer default 30)
returns setof uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  for v_id in
    update public.jobs set status = 'closed'
     where status = 'published' and selected_at < now() - make_interval(days => p_days)
    returning id
  loop
    perform private.log_audit('job.closed_after_selection', 'job', v_id);
    return next v_id;
  end loop;
end;
$$;
revoke all on function public.app_close_selected_jobs(integer) from public, anon, authenticated;
grant execute on function public.app_close_selected_jobs(integer) to service_role;
