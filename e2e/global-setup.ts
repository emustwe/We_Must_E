import { execFileSync } from "node:child_process";

// The app rate-limits signups per IP (5/hour). Every test signs up from the
// same address, so clear the local counters before each run. Local stack only.
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
    "truncate private.rate_limits",
  ]);
}
