import "server-only";
import { serverEnv } from "@/lib/env.server";
import { logError } from "@/lib/log";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Verifies a Cloudflare Turnstile token. Fails closed in production when no
// secret is configured; skipped in local development without a secret.
export async function verifyTurnstile(token: string | undefined): Promise<boolean> {
  const secret = serverEnv.TURNSTILE_SECRET_KEY;
  if (!secret) return process.env.NODE_ENV !== "production";
  if (!token || token.length > 2048) return false;
  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (error) {
    logError("turnstile", error);
    return false;
  }
}
