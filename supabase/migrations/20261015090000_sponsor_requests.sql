-- =============================================================================
-- Sponsor requests: companies ask to become a sponsor
-- =============================================================================
-- Anyone can send a request from the "For sponsors" page (the server checks
-- the bot test and a rate limit, then writes it with the service role). Only
-- MFA admins can read requests, and they mark each one approved (after
-- creating the account) or declined. Requests are kept until an admin
-- deletes them.
-- =============================================================================

create type public.sponsor_request_status as enum ('new', 'approved', 'declined');

create table public.sponsor_requests (
  id             uuid primary key default gen_random_uuid(),
  company_name   text not null check (char_length(company_name) between 2 and 160),
  contact_person text not null check (char_length(contact_person) between 2 and 120),
  email          text not null check (char_length(email) between 3 and 254),
  phone          text not null check (char_length(phone) between 6 and 32),
  city           text not null check (char_length(city) between 1 and 120),
  website        text check (char_length(website) <= 300),
  message        text check (char_length(message) <= 2000),
  status         public.sponsor_request_status not null default 'new',
  ip_hash        text check (char_length(ip_hash) <= 128),
  created_at     timestamptz not null default now(),
  handled_by     uuid references public.profiles (id) on delete set null,
  handled_at     timestamptz
);
create index sponsor_requests_status_idx on public.sponsor_requests (status, created_at desc);
create index sponsor_requests_handler_idx on public.sponsor_requests (handled_by);

alter table public.sponsor_requests enable row level security;
alter table public.sponsor_requests force row level security;
revoke all on public.sponsor_requests from anon, authenticated;
grant select on public.sponsor_requests to authenticated;
create policy "sponsor_requests: MFA admins read" on public.sponsor_requests
  for select to authenticated using (private.is_mfa_admin());

-- An MFA admin marks a request approved or declined (audited).
create function public.admin_handle_sponsor_request(
  p_request_id uuid, p_status public.sponsor_request_status)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_mfa_admin();
  if p_status = 'new' then raise exception 'invalid_input' using errcode = '22023'; end if;
  update public.sponsor_requests
     set status = p_status, handled_by = (select auth.uid()), handled_at = now()
   where id = p_request_id;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  perform private.log_audit('sponsor_request.handled', 'sponsor_request', p_request_id,
                            jsonb_build_object('to', p_status));
end;
$$;

-- An MFA admin deletes a request (audited, without the company's details).
create function public.admin_delete_sponsor_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_mfa_admin();
  delete from public.sponsor_requests where id = p_request_id;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  perform private.log_audit('sponsor_request.deleted', 'sponsor_request', p_request_id);
end;
$$;

revoke all on function
  public.admin_handle_sponsor_request(uuid, public.sponsor_request_status),
  public.admin_delete_sponsor_request(uuid)
  from public, anon, authenticated;
grant execute on function
  public.admin_handle_sponsor_request(uuid, public.sponsor_request_status),
  public.admin_delete_sponsor_request(uuid)
  to authenticated;

-- Sponsor account changes an admin can log: the set-password invite, and
-- blocking or unblocking the login. (Sponsors still only log their own logo.)
create or replace function public.log_sponsor_change(p_employer_id uuid, p_change text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_change not in ('logo', 'password', 'deleted', 'invite', 'blocked', 'unblocked') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  if not (private.is_mfa_admin()
          or (p_change = 'logo' and p_employer_id = (select auth.uid()) and private.is_approved_employer())) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from public.employer_profiles where user_id = p_employer_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if not private.within_sponsor_limit('sponsor-change') then
    raise exception 'rate_limited' using errcode = '54000';
  end if;
  perform private.log_audit('sponsor.' || p_change, 'employer', p_employer_id);
end;
$$;
