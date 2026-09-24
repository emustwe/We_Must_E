// Loads an env file for the command-line scripts: `--prod` reads
// .env.production.local (live project), otherwise .env.local (local stack).
import { readFileSync } from "node:fs";

export function loadEnv() {
  const file = process.argv.includes("--prod") ? ".env.production.local" : ".env.local";
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^"(.*)"$/, "$1");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in ${file}`,
    );
  return { url, key, file };
}
