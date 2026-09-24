import { execFileSync } from "node:child_process";

// Local stack only. Resets state the suite depends on:
// - app rate-limit counters (every test signs up/in from the same IP)
// - the seeded admin's MFA factors, so the suite can enroll a fresh TOTP secret
export default function globalSetup() {
  execFileSync("docker", [
    "exec",
    "supabase_db_we_must_e",
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-qc",
    `truncate private.rate_limits;
     delete from auth.mfa_factors where user_id = (select id from auth.users where email = 'admin@wemuste.local');`,
  ]);
}
