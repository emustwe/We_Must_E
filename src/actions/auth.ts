"use server";

import type { AuthError, EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { clientEnv } from "@/lib/env";
import { logError } from "@/lib/log";
import { fail, ok, type ActionResult } from "@/lib/result";
import { HOME_BY_ROLE } from "@/lib/routes";
import { getClientIp } from "@/lib/security/ip";
import { withinRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  toFieldErrors,
} from "@/lib/validations/auth";

// Only admins and employers have accounts. Job seekers apply without one.

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

export async function signIn(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput", toFieldErrors(parsed.error));
  const { email, password, captchaToken } = parsed.data;

  const ip = await getClientIp();
  const [ipOk, emailOk] = await Promise.all([
    withinRateLimit("loginPerIp", ip),
    withinRateLimit("loginPerEmail", email),
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
    withinRateLimit("resetPerEmail", email),
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
  if (!user) return fail("sessionExpired");

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return mapAuthError(error, "update-password");
  // An invited employer who used "forgot password" has now set their own password.
  await supabase.rpc("complete_password_change");

  // A password change signs the account out everywhere, including here.
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login?reset=1");
}
