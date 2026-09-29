-- =============================================================================
-- Salespeople with referral codes; applications go straight to the sponsor
-- =============================================================================
-- 1. Admins create salespeople (a referral code and a nickname). A company
--    asking to become a sponsor can enter a code (optional); the request, and
--    the sponsor account made from it, are linked to that salesperson.
-- 2. A sent application no longer waits for the team's review: it is shared
--    with the job's sponsor at once (contact details stay hidden until paid
--    for). Admins can still remove one (status 'rejected'). Applications that
--    were waiting for review are shared now.
-- =============================================================================

create table public.sales_people (
  id         uuid primary key default gen_random_uuid(),
  code       text not null check (code ~ '^[A-Z0-9-]{3,20}$'),
  nickname   text not null check (char_length(nickname) between 2 and 60),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);
create unique index sales_people_code_key on public.sales_people (code);
create index sales_people_creator_idx on public.sales_people (created_by);
alter table public.sales_people enable row level security;
alter table public.sales_people force row level security;
revoke all on public.sales_people from anon, authenticated;
grant select on public.sales_people to authenticated;
create policy "sales_people: MFA admins read" on public.sales_people
  for select to authenticated using (private.is_mfa_admin());

alter table public.sponsor_requests
  add column salesperson_id uuid references public.sales_people (id) on delete set null;
create index sponsor_requests_salesperson_idx on public.sponsor_requests (salesperson_id);
alter table public.employer_profiles
  add column referred_by uuid references public.sales_people (id) on delete set null;
create index employer_profiles_referred_idx on public.employer_profiles (referred_by);

-- An MFA admin creates a salesperson (the code is kept in capitals). Audited.
create function public.admin_create_salesperson(p_code text, p_nickname text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_code text := upper(trim(p_code)); v_name text := trim(p_nickname);
begin
  perform private.require_mfa_admin();
  if v_code !~ '^[A-Z0-9-]{3,20}$' or char_length(v_name) not between 2 and 60 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  insert into public.sales_people (code, nickname, created_by)
  values (v_code, v_name, (select auth.uid()))
  returning id into v_id;
  perform private.log_audit('salesperson.created', 'salesperson', v_id);
  return v_id;
exception when unique_violation then
  raise exception 'code_taken' using errcode = '23505';
end;
$$;
revoke all on function public.admin_create_salesperson(text, text) from public, anon, authenticated;
grant execute on function public.admin_create_salesperson(text, text) to authenticated;

create or replace function public.admin_handle_sponsor_request(
  p_request_id uuid, p_status public.sponsor_request_status)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_mfa_admin();
  if p_status = 'new' then raise exception 'invalid_input' using errcode = '22023'; end if;
  update public.sponsor_requests
     set status = p_status, handled_by = (select auth.uid()), handled_at = now()
   where id = p_request_id;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  -- A request that came with a referral code: the sponsor account made from
  -- it (same email) is linked to that salesperson.
  if p_status = 'approved' then
    update public.employer_profiles e set referred_by = r.salesperson_id
      from public.sponsor_requests r
     where r.id = p_request_id and r.salesperson_id is not null
       and lower(e.contact_email) = lower(r.email) and e.referred_by is null;
  end if;
  perform private.log_audit('sponsor_request.handled', 'sponsor_request', p_request_id,
                            jsonb_build_object('to', p_status));
end;
$$;

-- Sent applications go straight to the sponsor.
create or replace function public.app_submit(p_job_id uuid, p_token_hash text, p_full_name text, p_phone_e164 text, p_email text, p_answers jsonb, p_consent_version text, p_ip_hash text, p_phone_verified boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v public.applications; v_applicant uuid; v_q record; v_a jsonb;
begin
  v := private.app_for_token(p_job_id, p_token_hash);
  if v.current_step <> 'survey' then raise exception 'wrong_step' using errcode = '22023'; end if;
  if not p_phone_verified then raise exception 'phone_unverified' using errcode = '22023'; end if;
  if jsonb_typeof(p_answers) is distinct from 'object'
     or exists (select 1 from jsonb_object_keys(p_answers) k
                 where not exists (select 1 from public.survey_questions q
                                    where q.survey_id = v.survey_id and q.id::text = k)) then
    raise exception 'invalid_answer' using errcode = '22023';
  end if;

  for v_q in select * from public.survey_questions where survey_id = v.survey_id loop
    v_a := p_answers -> v_q.id::text;
    if v_a is null then
      if v_q.required then raise exception 'incomplete' using errcode = '22023'; end if;
      continue;
    end if;
    if not coalesce(case v_q.type
      when 'single_choice' then jsonb_typeof(v_a -> 'options') = 'array' and jsonb_array_length(v_a -> 'options') = 1
      when 'multi_choice' then jsonb_typeof(v_a -> 'options') = 'array' and jsonb_array_length(v_a -> 'options') >= 1
      when 'number' then jsonb_typeof(v_a -> 'number') = 'number'
      when 'scale' then jsonb_typeof(v_a -> 'number') = 'number' and (v_a ->> 'number')::numeric between 1 and 5
      else jsonb_typeof(v_a -> 'text') = 'string' and char_length(v_a ->> 'text') between 1 and 3000
    end, false) or (v_q.type in ('single_choice', 'multi_choice') and exists (
      select 1 from jsonb_array_elements(v_a -> 'options') o
       where jsonb_typeof(o) <> 'number' or (o #>> '{}')::numeric <> floor((o #>> '{}')::numeric)
          or (o #>> '{}')::numeric < 0
          or (o #>> '{}')::numeric >= jsonb_array_length(v_q.options))) then
      raise exception 'invalid_answer' using errcode = '22023';
    end if;
    insert into public.application_survey_answers (application_id, question_id, answer)
    values (v.id, v_q.id, v_a)
    on conflict (application_id, question_id) do update set answer = excluded.answer;
  end loop;

  -- The phone number links a person's applications. An existing person's
  -- name and email are never changed from here (the phone isn't verified):
  -- what this applicant typed is kept on this application only.
  insert into public.applicants (phone_e164, email, full_name)
  values (p_phone_e164, nullif(lower(trim(p_email)), ''), trim(p_full_name))
  on conflict (phone_e164) do update set phone_e164 = public.applicants.phone_e164
  returning id into v_applicant;

  insert into public.consents (application_id, text_version, ip_hash)
  values (v.id, p_consent_version, left(p_ip_hash, 128));

  update public.applications set
    applicant_id = v_applicant, status = 'approved', current_step = 'submitted',
    submitted_at = now(), reviewed_at = now(), draft_token_hash = null,
    contact_name = left(trim(p_full_name), 120),
    contact_email = left(nullif(lower(trim(p_email)), ''), 254),
    contact_phone = p_phone_e164
  where id = v.id;
  return v.id;
end;
$function$;

update public.applications set status = 'approved', reviewed_at = coalesce(reviewed_at, now())
 where status = 'submitted';

-- The admin's Applications page: every job with applications, newest first.
create function public.admin_application_jobs()
returns table (job_id uuid, title text, location_label text, company_name text,
               total bigint, today bigint, last_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select j.id, j.title, j.location_label, e.company_name,
         count(*), count(*) filter (where a.submitted_at > now() - interval '24 hours'),
         max(a.submitted_at)
    from public.applications a
    join public.jobs j on j.id = a.job_id
    join public.employer_profiles e on e.user_id = j.employer_id
   where a.status <> 'in_progress' and private.is_mfa_admin()
   group by j.id, j.title, j.location_label, e.company_name
   order by max(a.submitted_at) desc
   limit 500;
$$;
revoke all on function public.admin_application_jobs() from public, anon, authenticated;
grant execute on function public.admin_application_jobs() to authenticated;
