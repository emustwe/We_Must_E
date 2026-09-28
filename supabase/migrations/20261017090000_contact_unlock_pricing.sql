-- =============================================================================
-- Sponsors see approved candidates right away; only contact details cost E-coins
-- =============================================================================
-- 1. Once the Muste team approves a candidate, the sponsor sees the whole
--    application at once: profile, test answers, videos and survey answers.
--    Only the contact details stay hidden: the name, phone, email and CV, and
--    any email, phone number, link or the candidate's name written inside an
--    answer. Those are replaced with "•••" here in the database, so they
--    never reach the sponsor's browser.
-- 2. Opening a candidate's contact details costs E-coins:
--    - a candidate not yet counted in an earlier payment: the number of the
--      job's approved candidates not yet counted (10 new candidates: 10
--      E-coins), and all of them are then counted;
--    - a candidate already counted in an earlier payment: 1 E-coin.
--    The sponsor's page sends the price it showed; if it changed meanwhile
--    (a new candidate was approved), nothing is charged and the page shows
--    the new price. The contact details stay open while the application
--    exists: until the job closes or the application is deleted.
-- Candidates opened before this change stay open and count as paid.
-- =============================================================================

-- Candidates counted in a payment (whether or not their contact was opened).
create table public.candidate_counted (
  application_id uuid primary key references public.applications (id) on delete cascade,
  employer_id    uuid not null references public.employer_profiles (user_id) on delete cascade,
  counted_at     timestamptz not null default now()
);
create index candidate_counted_employer_idx on public.candidate_counted (employer_id);
alter table public.candidate_counted enable row level security;
alter table public.candidate_counted force row level security;
revoke all on public.candidate_counted from anon, authenticated;
grant select on public.candidate_counted to authenticated;
create policy "candidate_counted: sponsor reads own" on public.candidate_counted
  for select to authenticated using (employer_id = (select auth.uid()));
create policy "candidate_counted: admin reads" on public.candidate_counted
  for select to authenticated using (private.is_mfa_admin());

insert into public.candidate_counted (application_id, employer_id, counted_at)
select application_id, employer_id, unlocked_at from public.candidate_unlocks
on conflict do nothing;

-- Hides contact details in free text: emails, links, social handles, phone
-- numbers (9 or more digits, so years and amounts stay) and the candidate's
-- name (each part of 3 or more letters).
create function private.mask_contacts(p_text text, p_name text)
returns text language plpgsql immutable set search_path = '' as $$
declare v text := p_text; m text; w text;
begin
  if v is null or v = '' then return v; end if;
  v := regexp_replace(v, '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '•••', 'g');
  v := regexp_replace(v, '(https?://|www\.)\S+', '•••', 'gi');
  v := regexp_replace(v, '\S*(wa\.me|t\.me|linkedin\.com|facebook\.com|fb\.com|instagram\.com)\S*', '•••', 'gi');
  v := regexp_replace(v, '(^|\s)@[A-Za-z0-9_.]{3,}', '\1•••', 'g');
  for m in select (regexp_matches(v, '\+?\d[\d\s().-]{6,}\d', 'g'))[1] loop
    if char_length(regexp_replace(m, '\D', '', 'g')) >= 9 then
      v := replace(v, m, '•••');
    end if;
  end loop;
  foreach w in array regexp_split_to_array(coalesce(trim(p_name), ''), '\s+') loop
    if char_length(w) >= 3 then
      v := regexp_replace(v, '\m' || regexp_replace(w, '([.*+?^${}()|\[\]\\-])', '\\\1', 'g') || '\M',
                          '•••', 'gi');
    end if;
  end loop;
  return v;
end;
$$;

-- The same for every text inside an answer (lists, "other" texts, typing).
create function private.mask_jsonb(p jsonb, p_name text)
returns jsonb language plpgsql immutable set search_path = '' as $$
begin
  return case jsonb_typeof(p)
    when 'string' then to_jsonb(private.mask_contacts(p #>> '{}', p_name))
    when 'array' then coalesce(
      (select jsonb_agg(private.mask_jsonb(e, p_name) order by i)
         from jsonb_array_elements(p) with ordinality as t (e, i)), '[]'::jsonb)
    when 'object' then coalesce(
      (select jsonb_object_agg(k, private.mask_jsonb(v, p_name)) from jsonb_each(p) as t (k, v)),
      '{}'::jsonb)
    else p
  end;
end;
$$;

-- What opening this candidate's contact details costs now (0 if open).
create function private.contact_price(p_application_id uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from public.candidate_unlocks u where u.application_id = p_application_id) then 0
    when exists (select 1 from public.candidate_counted c where c.application_id = p_application_id) then 1
    else (select count(*)::integer
            from public.applications a
           where a.job_id = (select job_id from public.applications where id = p_application_id)
             and a.status = 'approved'
             and not exists (select 1 from public.candidate_counted c where c.application_id = a.id))
  end;
$$;
revoke all on function private.contact_price(uuid) from public, anon, authenticated;

-- Candidate lists: the name only once the contact is open, and the price.
drop function public.sponsor_list_candidates(uuid, integer);
create function public.sponsor_list_candidates(p_job_id uuid, p_page integer default 0)
returns table (application_id uuid, full_name text, reviewed_at timestamptz, unlocked boolean,
               price integer, total bigint)
language sql stable security definer set search_path = '' as $$
  with c as (
    select a.id, a.contact_name, a.reviewed_at,
           exists (select 1 from public.candidate_unlocks u where u.application_id = a.id) as unlocked
      from public.applications a
      join public.jobs j on j.id = a.job_id
     where a.job_id = p_job_id and a.status = 'approved'
       and j.employer_id = (select auth.uid()) and private.is_approved_employer())
  select id, case when unlocked then contact_name end, reviewed_at, unlocked,
         private.contact_price(id), count(*) over ()
    from c
   order by reviewed_at desc, id
   limit 20 offset greatest(p_page, 0) * 20;
$$;

drop function public.sponsor_all_candidates(integer);
create function public.sponsor_all_candidates(p_page integer default 0)
returns table (application_id uuid, job_id uuid, job_title text, full_name text,
               reviewed_at timestamptz, unlocked boolean, price integer, total bigint,
               locked_total bigint)
language sql stable security definer set search_path = '' as $$
  with c as (
    select a.id, a.job_id, j.title, a.contact_name, a.reviewed_at,
           exists (select 1 from public.candidate_unlocks u where u.application_id = a.id) as unlocked
      from public.applications a
      join public.jobs j on j.id = a.job_id
     where a.status = 'approved' and j.employer_id = (select auth.uid()) and private.is_approved_employer())
  select id, job_id, title, case when unlocked then contact_name end, reviewed_at, unlocked,
         private.contact_price(id), count(*) over (), count(*) filter (where not unlocked) over ()
    from c
   order by reviewed_at desc, id
   limit 20 offset greatest(p_page, 0) * 20;
$$;

drop function public.sponsor_candidate_summary(uuid);
create function public.sponsor_candidate_summary(p_application_id uuid)
returns table (application_id uuid, job_id uuid, job_title text, full_name text,
               reviewed_at timestamptz, unlocked boolean, price integer)
language sql stable security definer set search_path = '' as $$
  select a.id, a.job_id, j.title,
         case when u.application_id is not null then a.contact_name end,
         a.reviewed_at, u.application_id is not null, private.contact_price(a.id)
    from public.applications a
    join public.jobs j on j.id = a.job_id
    left join public.candidate_unlocks u on u.application_id = a.id
   where a.id = p_application_id and private.employer_owns_approved(a.id);
$$;

revoke all on function
  public.sponsor_list_candidates(uuid, integer),
  public.sponsor_all_candidates(integer),
  public.sponsor_candidate_summary(uuid)
  from public, anon;
grant execute on function
  public.sponsor_list_candidates(uuid, integer),
  public.sponsor_all_candidates(integer),
  public.sponsor_candidate_summary(uuid)
  to authenticated;

-- The approved candidate: everything, with the contact details hidden until
-- they are opened. Gender, age, admin notes and IP data are never included.
create or replace function public.sponsor_get_candidate(p_application_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v jsonb; v_open boolean; v_name text;
begin
  if not private.employer_owns_approved(p_application_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  v_open := exists (select 1 from public.candidate_unlocks where application_id = p_application_id);
  select concat_ws(' ', a.contact_name, a.profile ->> 'fullName', a.profile ->> 'preferredName')
    into v_name from public.applications a where a.id = p_application_id;
  select jsonb_build_object(
    'id', a.id, 'job_id', a.job_id, 'job_title', j.title,
    'unlocked', v_open, 'price', private.contact_price(a.id),
    'counted', exists (select 1 from public.candidate_counted c where c.application_id = a.id),
    'full_name', case when v_open then a.contact_name end,
    'phone', case when v_open then a.contact_phone end,
    'email', case when v_open then a.contact_email end,
    'submitted_at', a.submitted_at, 'approved_at', a.reviewed_at,
    'profile', case when v_open
      then coalesce(a.profile, '{}'::jsonb) - 'fullName' - 'phone' - 'email' - 'gender' - 'age' - 'adult'
      else private.mask_jsonb(coalesce(a.profile, '{}'::jsonb) - 'fullName' - 'preferredName' - 'phone'
                              - 'email' - 'gender' - 'age' - 'adult', v_name)
    end,
    'has_cv', a.cv_path is not null,
    'test', coalesce((
      select jsonb_agg(jsonb_build_object('prompt', q.prompt, 'type', q.type, 'options', q.options,
                                          'answer', case when v_open then t.answer
                                                         else private.mask_jsonb(t.answer, v_name) end)
                       order by q.position)
        from public.test_questions q
        left join public.application_test_answers t on t.question_id = q.id and t.application_id = a.id
       where q.test_id = a.test_id), '[]'),
    'survey', coalesce((
      select jsonb_agg(jsonb_build_object('prompt', q.prompt, 'type', q.type, 'options', q.options,
                                          'answer', case when v_open then s.answer
                                                         else private.mask_jsonb(s.answer, v_name) end)
                       order by q.position)
        from public.survey_questions q
        join public.application_survey_answers s on s.question_id = q.id and s.application_id = a.id), '[]'),
    'video_questions', case
      when exists (select 1 from public.application_videos v2 where v2.application_id = a.id and v2.question_id is not null)
      then '[]'::jsonb else private.video_prompts(a.id) end,
    'videos', coalesce((
      select jsonb_agg(jsonb_build_object('id', v.id, 'seconds', v.duration_seconds, 'prompt', vq.prompt)
                       order by vq.position nulls last, v.uploaded_at)
        from public.application_videos v
        left join public.video_questions vq on vq.id = v.question_id
       where v.application_id = a.id), '[]'))
    into v
    from public.applications a
    join public.jobs j on j.id = a.job_id
   where a.id = p_application_id;
  return v;
end;
$$;

-- Videos: any approved candidate's (the CV still needs the contact opened:
-- log_cv_view keeps private.employer_can_see_application).
create or replace function public.log_video_view(p_video_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v_application uuid; v_path text;
begin
  select application_id, storage_path into v_application, v_path
    from public.application_videos where id = p_video_id;
  if v_application is null
     or not (private.is_mfa_admin() or private.employer_owns_approved(v_application)) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if not private.within_sponsor_limit('media') then
    raise exception 'rate_limited' using errcode = '54000';
  end if;
  perform private.log_audit('application.video_viewed', 'application', v_application,
                            jsonb_build_object('video', p_video_id));
  return v_path;
end;
$$;

-- Opening the contact details, at the price the sponsor was shown. Returns
-- the new balance.
drop function public.sponsor_unlock_candidate(uuid);
create function public.sponsor_unlock_candidate(p_application_id uuid, p_expected_price integer)
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
  insert into public.ecoin_ledger (employer_id, delta, reason, application_id, note, created_by)
  values (v_uid, -v_price, 'unlock', p_application_id,
          case when v_counted > 1 then format('%s candidates counted', v_counted) end, v_uid);
  perform private.log_audit('candidate.unlocked', 'application', p_application_id,
                            jsonb_build_object('price', v_price, 'counted', v_counted));
  return v_balance;
end;
$$;
revoke all on function public.sponsor_unlock_candidate(uuid, integer) from public, anon;
grant execute on function public.sponsor_unlock_candidate(uuid, integer) to authenticated;
