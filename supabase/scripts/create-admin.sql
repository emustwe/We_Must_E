-- Promote an existing user to admin. Run in the Supabase SQL editor (or psql
-- as postgres). This is the only way to create an admin: the SQL editor has no
-- JWT, and the role guard blocks role changes from every API request.
--
-- 1. Create the user first: Dashboard > Authentication > Users > Add user
--    (tick "Auto confirm user"), with a strong unique password.
-- 2. Replace the email below and run this script.
-- 3. On first login the admin must enroll an authenticator app (MFA).

do $$
declare
  v_email constant text := 'admin@example.com';  -- <-- change me
  v_id uuid;
begin
  select id into v_id from auth.users where email = lower(v_email);
  if v_id is null then
    raise exception 'No auth user with email %', v_email;
  end if;

  update public.profiles set role = 'admin' where id = v_id;
  -- Admins are not job seekers or employers.
  delete from public.employee_profiles where user_id = v_id;
  delete from public.employer_profiles where user_id = v_id;
  delete from public.consents where user_id = v_id and type = 'data_sharing';

  raise notice 'User % is now an admin.', v_email;
end;
$$;
