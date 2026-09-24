-- =============================================================================
-- Account deletion (UAE PDPL): the audit trail keeps a pseudonymous record
-- =============================================================================
-- Called by the delete-account server action just before the auth user is
-- removed (which cascades through every table). The entry holds only the
-- user id and role; no personal data.
create function public.record_account_deletion()
returns void language plpgsql security definer set search_path = '' as $$
declare v_role public.user_role;
begin
  select role into v_role from public.profiles where id = (select auth.uid());
  if v_role is null or v_role = 'admin' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  -- Grants end now even if the deletion below were to fail.
  update public.access_grants set revoked_at = now()
   where employee_id = (select auth.uid()) and revoked_at is null;
  perform private.log_audit('account.deleted', 'user', (select auth.uid()),
                            jsonb_build_object('role', v_role));
end;
$$;

revoke all on function public.record_account_deletion() from public, anon;
grant execute on function public.record_account_deletion() to authenticated;
