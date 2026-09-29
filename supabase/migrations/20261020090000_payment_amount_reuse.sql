-- =============================================================================
-- USDT payments: an order's exact amount is reserved for 2 hours (was 24)
-- =============================================================================
-- An order is open for 30 minutes and a late payment still counts for 30
-- more, so a payment can only belong to its order within that hour. Keeping
-- the amount reserved for 2 hours is still safe, and gives 999 amounts per
-- pack every 2 hours instead of every day.
-- =============================================================================

create or replace function public.payment_create_order(
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
                             and (o.status = 'pending' or o.created_at > now() - interval '2 hours'));
    v_amount := null;
  end loop;
  if v_amount is null then raise exception 'rate_limited' using errcode = '54000'; end if;
  return query
  insert into public.payment_orders as o (employer_id, pack, coins, usd_cents, amount_micro, expires_at)
  values (p_employer_id, p_pack, p_coins, p_usd_cents, v_amount, now() + make_interval(mins => p_minutes))
  returning o.id, o.amount_micro, o.expires_at;
end;
$$;
