-- Admin CSV exports (Applications, Audit log) are logged before the file is
-- made. The entry holds only what was exported and how many rows; never the
-- filters' values or any personal data.
create function public.log_admin_export(p_kind text, p_rows integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_mfa_admin();
  if p_kind not in ('applications', 'audit') or p_rows < 0 or p_rows > 100000 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  perform private.log_audit('export.' || p_kind, null, null, jsonb_build_object('rows', p_rows));
end;
$$;
revoke all on function public.log_admin_export(text, integer) from public, anon;
grant execute on function public.log_admin_export(text, integer) to authenticated;
