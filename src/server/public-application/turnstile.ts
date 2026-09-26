import "server-only";
import { clientEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import { logError } from "@/lib/log";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const production = process.env.NODE_ENV === "production";

// Our own site (with and without "www."): a token solved on another site that
// uses the same widget key is refused.
function ourHost(hostname: unknown) {
  if (typeof hostname !== "string") return false;
  const site = new URL(clientEnv.NEXT_PUBLIC_SITE_URL).hostname.replace(/^www\./, "");
  return hostname.replace(/^www\./, "") === site;
}

// Verifies a Cloudflare Turnstile token. Fails closed in production when no
// secret is configured; skipped in local development without a secret.
export async function verifyTurnstile(token: string | undefined): Promise<boolean> {
  const secret = serverEnv.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (production) logError("turnstile", new Error("TURNSTILE_SECRET_KEY is not set"));
    return !production;
  }
  if (!token || token.length > 2048) return false;
  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean; hostname?: string };
    // (Cloudflare's test keys answer with a made-up hostname: checked in production only.)
    return data.success === true && (!production || ourHost(data.hostname));
  } catch (error) {
    logError("turnstile", error);
    return false;
  }
}
