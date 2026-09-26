"use server";

import type { AuthError, EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { clientEnv } from "@/lib/env";
import { logError } from "@/lib/log";
import { fail, ok, type ActionResult } from "@/lib/result";
import { HOME_BY_ROLE } from "@/lib/routes";
import { getClientIp } from "@/lib/security/ip";
import { withinRateLimit } from "@/lib/security/rate-limit";
import { completePasswordChange } from "@/lib/auth/password-change";
import { createClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  toFieldErrors,
} from "@/lib/validations/auth";

// Only admins and employers have accounts. Job seekers apply without one.

const ALLOWED_LINK_TYPES: EmailOtpType[] = [
  "email",
  "signup",
  "recovery",
  "email_change",
  "invite",
];
// A recovery session may change the password only for a short while.
const RECOVERY_WINDOW_SECONDS = 15 * 60;

const confirmUrl = (type: EmailOtpType) =>
  `${clientEnv.NEXT_PUBLIC_SITE_URL}/auth/confirm?type=${type}`;

// Map Supabase Auth errors to generic, non-enumerating messages.
function mapAuthError(error: AuthError, context: string): ActionResult<never> {
  switch (error.code) {
    case "weak_password":
      return fail("weakPassword", { password: "validation.passwordWeak" });
    case "same_password":
      return fail("samePassword", { password: "validation.passwordSame" });
    case "captcha_failed":
      return fail("captchaFailed");
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return fail("rateLimited");
    case "invalid_credentials":
    case "email_not_confirmed":
      // Invited accounts that never set a password look the same as a wrong password.
      return fail("invalidCredentials");
    default:
      logError(context, error);
      return fail("generic");
  }
}

// Uses the one-time token from an emailed link (posted by /auth/confirm).
// Supports the token_hash templates (work across devices) and the PKCE ?code=
// fallback. Destinations are fixed here, never taken from the request.
export async function confirmEmailLink(form: FormData) {
  const read = (key: string) => {
    const v = form.get(key);
    return typeof v === "string" && v.length <= 512 ? v : "";
  };
  const tokenHash = read("token_hash");
  const code = read("code");
  const type = ALLOWED_LINK_TYPES.find((allowed) => allowed === read("type"));

  const supabase = await createClient();
  let verified = false;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) logError("auth-confirm-otp", error);
    verified = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) logError("auth-confirm-code", error);
    verified = !error;
  }
  if (!verified) redirect("/login?link=invalid");
  if (type === "recovery") redirect("/reset-password");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  redirect(profile ? HOME_BY_ROLE[profile.role] : "/login");
}

// True when this session was opened from an emailed link in the last few
// minutes (not just any signed-in session, e.g. a borrowed laptop).
async function recentLinkSession(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.auth.getClaims();
  const amr = (data?.claims?.amr ?? []) as { method?: string; timestamp?: number }[];
  const now = Math.floor(Date.now() / 1000);
  return amr.some(
    (m) =>
      ["recovery", "otp", "magiclink", "invite"].includes(m.method ?? "") &&
      typeof m.timestamp === "number" &&
      now - m.timestamp < RECOVERY_WINDOW_SECONDS,
  );
}

export async function signIn(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput", toFieldErrors(parsed.error));
  const { email, password, captchaToken } = parsed.data;

  const ip = await getClientIp();
  const [ipOk, emailOk] = await Promise.all([
    withinRateLimit("loginPerIp", ip),
    // Per email *and* IP: someone else can't lock the owner out by failing on purpose.
    withinRateLimit("loginPerEmail", `${email}|${ip}`),
  ]);
  if (!ipOk || !emailOk) return fail("rateLimited");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: { captchaToken },
  });
  if (error) return mapAuthError(error, "sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile) {
    // An auth user without a profile (e.g. a leftover v1 account) gets nothing.
    await supabase.auth.signOut({ scope: "local" });
    return fail("invalidCredentials");
  }
  redirect(HOME_BY_ROLE[profile.role]);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}

// "Log out of all devices": revokes every refresh token for this user.
export async function signOutEverywhere() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login?signedOut=all");
}

// Always reports success so the response never reveals whether an account exists.
export async function requestPasswordReset(input: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput", toFieldErrors(parsed.error));
  const { email, captchaToken } = parsed.data;

  const ip = await getClientIp();
  const [ipOk, emailOk] = await Promise.all([
    withinRateLimit("resetPerIp", ip),
    withinRateLimit("resetPerEmail", `${email}|${ip}`),
  ]);
  if (!ipOk) return fail("rateLimited");
  if (!emailOk) return ok(undefined);

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    captchaToken,
    redirectTo: confirmUrl("recovery"),
  });
  if (error?.code === "captcha_failed") return fail("captchaFailed");
  if (error) logError("password-reset", error);
  return ok(undefined);
}

// Runs inside the recovery session created by /auth/confirm.
export async function updatePassword(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput", toFieldErrors(parsed.error));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await recentLinkSession(supabase))) return fail("sessionExpired");

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return mapAuthError(error, "update-password");
  // An invited employer who used "forgot password" has now set their own password.
  await completePasswordChange(user.id);

  // A password change signs the account out everywhere, including here.
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login?reset=1");
}
