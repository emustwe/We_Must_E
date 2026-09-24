#!/usr/bin/env node
// Fails the build if any server secret appears in client-side output.
// Run after `next build`. Checks the actual secret values from the environment
// plus patterns that should never ship to a browser.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = ".next/static";
const SECRET_ENV = ["SUPABASE_SERVICE_ROLE_KEY", "IP_HASH_SECRET", "RESEND_API_KEY"];
const PATTERNS = [
  { name: "Supabase secret key", re: /sb_secret_[A-Za-z0-9_-]{16,}/ },
  {
    name: "server env variable name",
    re: /\b(SUPABASE_SERVICE_ROLE_KEY|IP_HASH_SECRET|RESEND_API_KEY)\b/,
  },
];

const secrets = SECRET_ENV.map((name) => [name, process.env[name]]).filter(
  ([, value]) => value && value.length >= 12,
);
if (secrets.length === 0) {
  console.error("check-bundle-secrets: no secret values in the environment to check against.");
  process.exit(1);
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

const findings = [];
let files = 0;
for await (const file of walk(ROOT)) {
  files++;
  const content = await readFile(file, "utf8");
  for (const [name, value] of secrets)
    if (content.includes(value)) findings.push(`${file}: value of ${name}`);
  for (const { name, re } of PATTERNS) if (re.test(content)) findings.push(`${file}: ${name}`);
}

if (findings.length > 0) {
  console.error(
    "Secrets found in the client bundle:\n" + findings.map((f) => `  - ${f}`).join("\n"),
  );
  process.exit(1);
}
console.log(`check-bundle-secrets: ${files} client files scanned, no secrets found.`);
