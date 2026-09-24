import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { logError } from "@/lib/log";
import { hmac } from "@/lib/security/ip";

export const LIMITS = {
  signupPerIp: { max: 5, windowSeconds: 3600 },
  loginPerIp: { max: 20, windowSeconds: 900 },
  loginPerEmail: { max: 8, windowSeconds: 900 },
  resetPerIp: { max: 5, windowSeconds: 3600 },
  resetPerEmail: { max: 3, windowSeconds: 3600 },
  resendPerIp: { max: 5, windowSeconds: 3600 },
  jobRequestPerUser: { max: 30, windowSeconds: 86400 },
  jobPostPerEmployer: { max: 20, windowSeconds: 86400 },
  uploadPerUser: { max: 30, windowSeconds: 86400 },
} as const;

/**
 * Fixed-window limiter backed by public.check_rate_limit().
 * Uses the service-role client because that function is deliberately not
 * executable by anon/authenticated, so clients cannot inflate or reset counters.
 * Keys are HMACed: no raw IPs or emails are stored. Fails closed.
 */
export async function withinRateLimit(
  bucket: keyof typeof LIMITS,
  subject: string,
): Promise<boolean> {
  const { max, windowSeconds } = LIMITS[bucket];
  const { data, error } = await createAdminClient().rpc("check_rate_limit", {
    p_key: hmac(`${bucket}:${subject}`),
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    logError("rate-limit", error);
    return false;
  }
  return data === true;
}
