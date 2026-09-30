-- =============================================================================
-- Outreach: companies the team emails, each with its own private video link
-- =============================================================================
-- MFA admins add company contacts (name, company, email, country, and an
-- optional salesperson's referral code). Every contact gets a secret link
-- (/w/<token>) to the WemustE video page; the team pastes the email into its
-- own mailbox and sends it by hand. The page is read by the server only (the
-- service role), and records when the link is opened; anyone who
-- unsubscribes is never emailed again (unsubscribed contacts can't be deleted
-- or added again). Contacts who then ask to become a sponsor are marked
-- "signed up".
-- =============================================================================

create table public.outreach_contacts (
  id              uuid primary key default gen_random_uuid(),
  token           text not null default replace(gen_random_uuid()::text, '-', '')
                  check (token ~ '^[0-9a-f]{32}$'),
  name            text not null check (char_length(name) between 1 and 120),
  company         text not null check (char_length(company) between 1 and 160),
  email           text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  country         text check (char_length(country) <= 60),
  salesperson_id  uuid references public.sales_people (id) on delete set null,
  status          text not null default 'new'
                  check (status in ('new', 'sent', 'opened', 'signed_up', 'unsubscribed')),
  link_off        boolean not null default false,
  open_count      integer not null default 0,
  sent_at         timestamptz,
  first_opened_at timestamptz,
  last_opened_at  timestamptz,
  signed_up_at    timestamptz,
  unsubscribed_at timestamptz,
  created_at      timestamptz not null default now(),
  created_by      uuid references public.profiles (id) on delete set null
);
create unique index outreach_contacts_token_key on public.outreach_contacts (token);
create unique index outreach_contacts_email_key on public.outreach_contacts (lower(email));
create index outreach_contacts_status_idx on public.outreach_contacts (status, created_at desc);
create index outreach_contacts_salesperson_idx on public.outreach_contacts (salesperson_id);
create index outreach_contacts_creator_idx on public.outreach_contacts (created_by);
alter table public.outreach_contacts enable row level security;
alter table public.outreach_contacts force row level security;
revoke all on public.outreach_contacts from anon, authenticated;
grant select on public.outreach_contacts to authenticated;
create policy "outreach_contacts: MFA admins read" on public.outreach_contacts
  for select to authenticated using (private.is_mfa_admin());

-- An MFA admin adds contacts: [{name, company, email, country}], all with the
-- same (optional) salesperson. Emails already in the list are skipped.
create function public.admin_outreach_add(p_contacts jsonb, p_salesperson_id uuid default null)
returns table (added integer, skipped integer)
language plpgsql security definer set search_path = '' as $$
declare v jsonb; v_added integer := 0; v_total integer;
begin
  perform private.require_mfa_admin();
  if jsonb_typeof(p_contacts) is distinct from 'array'
     or jsonb_array_length(p_contacts) not between 1 and 500 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  v_total := jsonb_array_length(p_contacts);
  for v in select * from jsonb_array_elements(p_contacts) loop
    insert into public.outreach_contacts (name, company, email, country, salesperson_id, created_by)
    values (trim(v ->> 'name'), trim(v ->> 'company'), lower(trim(v ->> 'email')),
            nullif(trim(coalesce(v ->> 'country', '')), ''), p_salesperson_id, (select auth.uid()))
    on conflict ((lower(email))) do nothing;
    if found then v_added := v_added + 1; end if;
  end loop;
  if v_added > 0 then
    perform private.log_audit('outreach.added', 'outreach', null, jsonb_build_object('count', v_added));
  end if;
  return query select v_added, v_total - v_added;
exception when check_violation or not_null_violation then
  raise exception 'invalid_input' using errcode = '22023';
end;
$$;
revoke all on function public.admin_outreach_add(jsonb, uuid) from public, anon, authenticated;
grant execute on function public.admin_outreach_add(jsonb, uuid) to authenticated;

-- An MFA admin marks a contact's email as sent, turns its link off or on, or
-- deletes it (never an unsubscribed one: it must stay on the no-email list).
create function public.admin_outreach_update(p_id uuid, p_action text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_mfa_admin();
  case p_action
    when 'sent' then
      update public.outreach_contacts
         set status = case when status = 'new' then 'sent' else status end,
             sent_at = coalesce(sent_at, now())
       where id = p_id and status <> 'unsubscribed';
    when 'link_off' then
      update public.outreach_contacts set link_off = true where id = p_id;
    when 'link_on' then
      update public.outreach_contacts set link_off = false where id = p_id;
    when 'delete' then
      delete from public.outreach_contacts where id = p_id and status <> 'unsubscribed';
    else
      raise exception 'invalid_input' using errcode = '22023';
  end case;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  perform private.log_audit('outreach.' || p_action, 'outreach', p_id);
end;
$$;
revoke all on function public.admin_outreach_update(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_outreach_update(uuid, text) to authenticated;

-- The video page (server only): the contact behind a link that still works
-- (not turned off, not unsubscribed, and within 60 days of the email).
create function public.outreach_view(p_token text)
returns table (name text, company text, email text, referral_code text)
language sql stable security definer set search_path = '' as $$
  select c.name, c.company, c.email, s.code
    from public.outreach_contacts c
    left join public.sales_people s on s.id = c.salesperson_id
   where c.token = p_token and not c.link_off and c.status <> 'unsubscribed'
     and (c.sent_at is null or c.sent_at > now() - interval '60 days');
$$;

-- The page was opened (server only; not for admins' own previews).
create function public.outreach_opened(p_token text)
returns void language sql security definer set search_path = '' as $$
  update public.outreach_contacts
     set open_count = open_count + 1,
         first_opened_at = coalesce(first_opened_at, now()),
         last_opened_at = now(),
         status = case when status in ('new', 'sent') then 'opened' else status end
   where token = p_token and not link_off and status <> 'unsubscribed';
$$;

-- "Don't email me again" (server only). Works even when the link is off.
create function public.outreach_unsubscribe(p_token text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.outreach_contacts
     set status = 'unsubscribed', unsubscribed_at = coalesce(unsubscribed_at, now())
   where token = p_token;
  return found;
end;
$$;

-- A company asked to become a sponsor (server only): the contact who came
-- from its link, or with the same email, is marked signed up.
create function public.outreach_signed_up(p_token text, p_email text)
returns void language sql security definer set search_path = '' as $$
  update public.outreach_contacts
     set status = 'signed_up', signed_up_at = coalesce(signed_up_at, now())
   where (token = p_token or lower(email) = lower(trim(p_email)))
     and status <> 'unsubscribed';
$$;

revoke all on function public.outreach_view(text) from public, anon, authenticated;
revoke all on function public.outreach_opened(text) from public, anon, authenticated;
revoke all on function public.outreach_unsubscribe(text) from public, anon, authenticated;
revoke all on function public.outreach_signed_up(text, text) from public, anon, authenticated;
grant execute on function public.outreach_view(text) to service_role;
grant execute on function public.outreach_opened(text) to service_role;
grant execute on function public.outreach_unsubscribe(text) to service_role;
grant execute on function public.outreach_signed_up(text, text) to service_role;
