import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Test-only helpers for the local Supabase stack.
export const psql = (sql: string) =>
  execFileSync("docker", [
    "exec",
    "supabase_db_we_must_e",
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-Atqc",
    sql,
  ])
    .toString()
    .trim();

export const env: Record<string, string> = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((line) => line.includes("="))
    .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)]),
);

// Creates a confirmed, password-login user; returns the new id.
export function createUser(
  email: string,
  password: string,
  userMeta: object,
  appMeta: object = {},
) {
  return psql(`
    with u as (
      insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token,
        email_change_token_new, email_change, email_change_token_current, reauthentication_token, phone_change, phone_change_token)
      values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', '${email}',
        extensions.crypt('${password}', extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb || '${JSON.stringify(appMeta)}'::jsonb,
        '${JSON.stringify(userMeta)}'::jsonb, now(), now(), '', '', '', '', '', '', '', '')
      returning id, email)
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    select gen_random_uuid(), id, id::text, jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), 'email', now(), now(), now()
      from u returning user_id;`).split("\n")[0];
}

// Uploads bytes to a storage bucket with the service role (test setup only).
export async function uploadObject(
  bucket: string,
  path: string,
  bytes: Uint8Array,
  contentType: string,
) {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": contentType,
    },
    body: Buffer.from(bytes),
  });
  if (!res.ok) throw new Error(`upload failed: ${res.status} ${await res.text()}`);
}
