-- =============================================================================
-- Data retention and deletion
-- =============================================================================
-- The privacy policy promises that a sent application (with its CV and videos)
-- is deleted when the job closes, or 1 month after it was sent if the job is
-- still open. Admins can also delete an application at once (for example when
-- someone asks by email). The person's contact record (name, phone, email)
-- goes too, once no other application of theirs is left.
-- Answers, videos, consent and unlock rows are removed with the application
-- (foreign keys cascade); E-coin history keeps the coin movement without the
-- link. The audit log records that it happened, without personal details.
-- =============================================================================

-- Sent applications whose time is up: the job is closed or removed, or the
-- application was sent more than p_days ago. Server only (the nightly job).
create function public.app_expired_applications(p_days integer)
returns table (application_id uuid)
language sql stable security definer set search_path = '' as $$
  select a.id
    from public.applications a
    join public.jobs j on j.id = a.job_id
   where a.status <> 'in_progress'
     and (j.status in ('closed', 'removed')
          or a.submitted_at < now() - make_interval(days => greatest(p_days, 1)));
$$;

-- Deletes the given applications (after the server removed their files), and
-- the people they belonged to when nothing else of theirs is left.
create function private.delete_applications(p_application_ids uuid[], p_reason text)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_applicants uuid[]; v_id uuid; v_count integer;
begin
  select coalesce(array_agg(distinct applicant_id) filter (where applicant_id is not null), '{}')
    into v_applicants
    from public.applications where id = any (p_application_ids);
  for v_id in select id from public.applications where id = any (p_application_ids) loop
    perform private.log_audit('application.deleted', 'application', v_id,
                              jsonb_build_object('reason', p_reason));
  end loop;
  delete from public.applications where id = any (p_application_ids);
  get diagnostics v_count = row_count;
  delete from public.applicants p
   where p.id = any (v_applicants)
     and not exists (select 1 from public.applications a where a.applicant_id = p.id);
  return v_count;
end;
$$;

-- The nightly job (service role).
create function public.app_delete_expired(p_application_ids uuid[])
returns integer language sql security definer set search_path = '' as $$
  select private.delete_applications(p_application_ids, 'retention');
$$;

-- An MFA admin deletes one application at once (logged with the admin as actor).
create function public.admin_delete_application(p_application_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_mfa_admin();
  if not exists (select 1 from public.applications where id = p_application_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  perform private.delete_applications(array[p_application_id], 'admin');
end;
$$;

revoke all on function
  public.app_expired_applications(integer),
  private.delete_applications(uuid[], text),
  public.app_delete_expired(uuid[]),
  public.admin_delete_application(uuid)
  from public, anon, authenticated;
grant execute on function public.app_expired_applications(integer), public.app_delete_expired(uuid[])
  to service_role;
grant execute on function public.admin_delete_application(uuid) to authenticated;
