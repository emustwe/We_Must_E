-- =============================================================================
-- Sponsor requests: companies ask to become a sponsor
-- =============================================================================
-- Anyone can send a request from the "For sponsors" page (the server checks
-- the bot test and a rate limit, then writes it with the service role). Only
-- MFA admins can read requests, and they mark each one approved (after
-- creating the account) or declined. Handled requests are deleted after 90
-- days by the nightly job, so business contact details aren't kept forever.
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

-- The nightly job: handled requests older than p_days.
create function public.app_delete_old_sponsor_requests(p_days integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  delete from public.sponsor_requests
   where status <> 'new' and handled_at < now() - make_interval(days => greatest(p_days, 1));
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function
  public.admin_handle_sponsor_request(uuid, public.sponsor_request_status),
  public.app_delete_old_sponsor_requests(integer)
  from public, anon, authenticated;
grant execute on function public.admin_handle_sponsor_request(uuid, public.sponsor_request_status)
  to authenticated;
grant execute on function public.app_delete_old_sponsor_requests(integer) to service_role;
