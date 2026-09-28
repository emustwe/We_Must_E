-- =============================================================================
-- Sponsors buy E-coins with USDT on Solana, paid straight to Muste's wallet
-- =============================================================================
-- 1. A sponsor picks a pack; the server creates an order with an exact USDT
--    amount just for it (the price plus 0.0001-0.0999 USDT), open for 30
--    minutes. No two open orders share an amount, and an amount isn't reused
--    for 24 hours, so the amount tells which order was paid.
-- 2. The server watches the wallet on the Solana blockchain (a Helius notice,
--    or the sponsor's "check now"), checks every transfer itself and records
--    it. A transfer of exactly an order's amount, made while the order was
--    open (or up to 30 minutes after), pays it: the E-coins are added once.
--    Anything else waits for an admin to settle it by hand.
-- Only the server (service role) creates orders and records transfers, so
-- nobody can set their own price. Sponsors read their own orders; MFA admins
-- read everything and settle what didn't match.
-- =============================================================================

create type public.payment_status as enum ('pending', 'paid', 'expired');

create table public.payment_orders (
  id           uuid primary key default gen_random_uuid(),
  employer_id  uuid not null references public.employer_profiles (user_id) on delete cascade,
  pack         text not null check (char_length(pack) between 1 and 40),
  coins        integer not null check (coins between 1 and 100000),
  usd_cents    integer not null check (usd_cents between 1 and 100000000),
  -- The exact amount to send, in micro-USDT (USDT has 6 decimals).
  amount_micro bigint not null check (amount_micro > 0),
  status       public.payment_status not null default 'pending',
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  paid_at      timestamptz,
  tx_signature text unique check (char_length(tx_signature) between 32 and 100),
  settled_by   uuid references public.profiles (id) on delete set null
);
create unique index payment_orders_open_amount on public.payment_orders (amount_micro)
  where status = 'pending';
create index payment_orders_employer_idx on public.payment_orders (employer_id, created_at desc);
create index payment_orders_amount_idx on public.payment_orders (amount_micro, created_at desc);
create index payment_orders_settler_idx on public.payment_orders (settled_by);

-- Every USDT transfer into the wallet the server has checked on the blockchain.
create table public.payment_transfers (
  signature    text primary key check (char_length(signature) between 32 and 100),
  amount_micro bigint not null check (amount_micro > 0),
  block_time   timestamptz not null,
  -- The sending wallet (shown to admins to settle a payment by hand).
  from_owner   text check (char_length(from_owner) <= 64),
  order_id     uuid references public.payment_orders (id) on delete set null,
  seen_at      timestamptz not null default now()
);
create index payment_transfers_order_idx on public.payment_transfers (order_id);
create index payment_transfers_open_idx on public.payment_transfers (seen_at desc) where order_id is null;

alter table public.payment_orders enable row level security;
alter table public.payment_orders force row level security;
alter table public.payment_transfers enable row level security;
alter table public.payment_transfers force row level security;
revoke all on public.payment_orders, public.payment_transfers from anon, authenticated;
grant select on public.payment_orders, public.payment_transfers to authenticated;
create policy "payment_orders: sponsor reads own" on public.payment_orders
  for select to authenticated using (employer_id = (select auth.uid()));
create policy "payment_orders: admin reads" on public.payment_orders
  for select to authenticated using (private.is_mfa_admin());
create policy "payment_transfers: admin reads" on public.payment_transfers
  for select to authenticated using (private.is_mfa_admin());

-- E-coins bought: a new reason in the ledger, linked to the order, once.
alter table public.ecoin_ledger drop constraint ecoin_ledger_reason_check;
alter table public.ecoin_ledger
  add constraint ecoin_ledger_reason_check check (reason in ('admin_grant', 'unlock', 'purchase'));
alter table public.ecoin_ledger
  add column payment_order_id uuid references public.payment_orders (id) on delete set null;
create unique index ecoin_ledger_purchase_once on public.ecoin_ledger (payment_order_id)
  where reason = 'purchase';

-- A new order (server only, after it checked the sponsor and the pack).
create function public.payment_create_order(
  p_employer_id uuid, p_pack text, p_coins integer, p_usd_cents integer, p_minutes integer default 30)
returns table (id uuid, amount_micro bigint, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare v_amount bigint; v_try integer;
begin
  if not exists (select 1 from public.employer_profiles
                  where user_id = p_employer_id and status = 'approved') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_minutes not between 5 and 120 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  -- Open orders past their time (and the 30-minute grace) are closed.
  update public.payment_orders o set status = 'expired'
   where o.status = 'pending' and o.expires_at < now() - interval '30 minutes';
  if (select count(*) from public.payment_orders o
       where o.employer_id = p_employer_id and o.status = 'pending') >= 5 then
    raise exception 'too_many_orders' using errcode = '22023';
  end if;
  for v_try in 1..50 loop
    v_amount := p_usd_cents::bigint * 10000 + (1 + floor(random() * 999))::bigint * 100;
    exit when not exists (select 1 from public.payment_orders o
                           where o.amount_micro = v_amount
                             and (o.status = 'pending' or o.created_at > now() - interval '24 hours'));
    v_amount := null;
  end loop;
  if v_amount is null then raise exception 'rate_limited' using errcode = '54000'; end if;
  return query
  insert into public.payment_orders as o (employer_id, pack, coins, usd_cents, amount_micro, expires_at)
  values (p_employer_id, p_pack, p_coins, p_usd_cents, v_amount, now() + make_interval(mins => p_minutes))
  returning o.id, o.amount_micro, o.expires_at;
end;
$$;

-- Adds an order's E-coins (once) and marks it paid.
create function private.credit_payment_order(p_order_id uuid, p_signature text)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.payment_orders;
begin
  select * into v from public.payment_orders where id = p_order_id for update;
  if v.id is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  if v.status = 'paid' then raise exception 'already_paid' using errcode = '22023'; end if;
  update public.payment_orders
     set status = 'paid', paid_at = now(), tx_signature = p_signature,
         settled_by = case when private.is_mfa_admin() then (select auth.uid()) end
   where id = p_order_id;
  update public.employer_profiles set ecoin_balance = ecoin_balance + v.coins
   where user_id = v.employer_id;
  insert into public.ecoin_ledger (employer_id, delta, reason, payment_order_id, note, created_by)
  values (v.employer_id, v.coins, 'purchase', v.id,
          format('USDT payment (%s)', v.pack), (select auth.uid()));
  update public.payment_transfers set order_id = v.id where signature = p_signature;
  perform private.log_audit('payment.paid', 'payment_order', v.id,
                            jsonb_build_object('coins', v.coins, 'usd_cents', v.usd_cents,
                                               'by_admin', private.is_mfa_admin()));
end;
$$;
revoke all on function private.credit_payment_order(uuid, text) from public, anon, authenticated;

-- A transfer the server checked on the blockchain (server only). Returns
-- 'paid' (with the order), 'duplicate' or 'unmatched'.
create function public.payment_record_transfer(
  p_signature text, p_amount_micro bigint, p_block_time timestamptz, p_from text)
returns table (result text, order_id uuid)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare v_order uuid;
begin
  insert into public.payment_transfers (signature, amount_micro, block_time, from_owner)
  values (p_signature, p_amount_micro, p_block_time, left(p_from, 64))
  on conflict (signature) do nothing;
  if not found then
    return query select 'duplicate'::text, t.order_id from public.payment_transfers t where t.signature = p_signature;
    return;
  end if;
  select o.id into v_order
    from public.payment_orders o
   where o.amount_micro = p_amount_micro
     and o.status in ('pending', 'expired')
     and p_block_time between o.created_at - interval '2 minutes' and o.expires_at + interval '30 minutes'
   order by o.created_at desc
   limit 1
   for update;
  if v_order is null then
    return query select 'unmatched'::text, null::uuid;
    return;
  end if;
  perform private.credit_payment_order(v_order, p_signature);
  return query select 'paid'::text, v_order;
end;
$$;

-- An MFA admin settles a transfer that didn't match by paying an order with it.
create function public.admin_settle_transfer(p_signature text, p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_mfa_admin();
  if not exists (select 1 from public.payment_transfers where signature = p_signature and order_id is null) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  perform private.credit_payment_order(p_order_id, p_signature);
end;
$$;

revoke all on function
  public.payment_create_order(uuid, text, integer, integer, integer),
  public.payment_record_transfer(text, bigint, timestamptz, text),
  public.admin_settle_transfer(text, uuid)
  from public, anon, authenticated;
grant execute on function
  public.payment_create_order(uuid, text, integer, integer, integer),
  public.payment_record_transfer(text, bigint, timestamptz, text)
  to service_role;
grant execute on function public.admin_settle_transfer(text, uuid) to authenticated;
