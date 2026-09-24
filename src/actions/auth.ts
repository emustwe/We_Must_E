"use server";

import type { AuthError, EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { readPendingEmail, rememberPendingEmail } from "@/lib/auth/pending-email";
import { clientEnv } from "@/lib/env";
import { CONSENT_VERSIONS } from "@/lib/legal";
import { logError } from "@/lib/log";
import { fail, ok, type ActionResult } from "@/lib/result";
import { HOME_BY_ROLE } from "@/lib/routes";
import { getClientIp, hmac } from "@/lib/security/ip";
import { withinRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import {
  employeeSignupSchema,
  forgotPasswordSchema,
  loginSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  toFieldErrors,
} from "@/lib/validations/auth";

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
      return fail("invalidCredentials");
    case "email_not_confirmed":
      return fail("emailNotConfirmed");
    default:
      logError(context, error);
      return fail("generic");
  }
}

export async function signUpEmployee(input: unknown): Promise<ActionResult> {
  const parsed = employeeSignupSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput", toFieldErrors(parsed.error));
  const { fullName, email, password, captchaToken } = parsed.data;

  const ip = await getClientIp();
  if (!(await withinRateLimit("signupPerIp", ip))) return fail("rateLimited");

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      captchaToken,
      emailRedirectTo: confirmUrl("email"),
      // Read once by the handle_new_user trigger. It only ever accepts
      // 'employee' or 'employer' as a role; admins are never created here.
      data: {
        role: "employee",
        full_name: fullName,
        consents: CONSENT_VERSIONS,
        ip_hash: hmac(ip),
      },
    },
  });
  // An existing address is treated as success so signup cannot reveal it.
  if (error && error.code !== "user_already_exists" && error.code !== "email_exists") {
    return mapAuthError(error, "signup-employee");
  }

  await rememberPendingEmail(email);
  redirect("/verify-email");
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
  if (error) {
    if (error.code === "email_not_confirmed") await rememberPendingEmail(email);
    return mapAuthError(error, "sign-in");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();
  redirect(profile ? HOME_BY_ROLE[profile.role] : "/");
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

  // A password change signs the account out everywhere, including here.
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login?reset=1");
}

export async function resendVerification(input: unknown): Promise<ActionResult> {
  const parsed = resendVerificationSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput");

  const email = await readPendingEmail();
  if (!email) return ok(undefined);

  const ip = await getClientIp();
  if (!(await withinRateLimit("resendPerIp", ip))) return fail("rateLimited");

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { captchaToken: parsed.data.captchaToken, emailRedirectTo: confirmUrl("email") },
  });
  if (error?.code === "captcha_failed") return fail("captchaFailed");
  if (error?.code === "over_email_send_rate_limit") return fail("rateLimited");
  if (error) logError("resend-verification", error);
  return ok(undefined);
}
