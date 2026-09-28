"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminMfa } from "@/lib/auth/session";
import { clientEnv } from "@/lib/env";
import { dbFail } from "@/lib/db-errors";
import { sendEmail } from "@/lib/email/send";
import { generatePassword } from "@/lib/generate-password";
import { logError } from "@/lib/log";
import { fail, ok, type ActionResult } from "@/lib/result";
import { revokeSessions } from "@/lib/auth/password-change";
import { removeSponsorFiles } from "@/lib/sponsors/cleanup";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { toFieldErrors } from "@/lib/validations/auth";
import {
  createEmployerSchema,
  ecoinSchema,
  employerStatusSchema,
  blockSponsorSchema,
  idSchema,
  SPONSOR_BLOCKS,
} from "@/lib/validations/jobs";

export type CreatedSponsor = { email: string; companyName: string; emailed: boolean };

// A one-hour link where the sponsor chooses their own password (a recovery
// link: /auth/confirm, then "Choose your password"). Service role: only it
// can make links for another user. Returns whether the email was sent.
async function sendSetupLink(email: string) {
  const { data, error } = await createAdminClient().auth.admin.generateLink({
    type: "recovery",
    email,
  });
  if (error || !data.properties?.hashed_token) {
    logError("admin-sponsor-setup-link", error);
    return false;
  }
  const link = `${clientEnv.NEXT_PUBLIC_SITE_URL}/auth/confirm?token_hash=${data.properties.hashed_token}&type=recovery`;
  return sendEmail("sponsorInvite", email, { email, link });
}

// Creates and approves a sponsor, and emails them a link to choose their own
// password. Nobody at WemustE ever knows it.
export async function createEmployer(input: unknown): Promise<ActionResult<CreatedSponsor>> {
  const parsed = createEmployerSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput", toFieldErrors(parsed.error));
  const admin = await requireAdminMfa();
  const { companyName, contactPerson, email, phone, tradeLicenseNo, website } = parsed.data;
  // A random password nobody sees; the sponsor sets their own with the link.
  const password = generatePassword();

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("employer_profiles")
    .select("user_id")
    .eq("contact_email", email) // emails are stored and validated lowercase
    .limit(1);
  if (existing?.length) return fail("emailTaken", { email: "validation.emailTaken" });

  // Service role is required: only it can create users and set
  // app_metadata.wemuste_role, which is what makes the account a sponsor
  // (a database trigger provisions the profile). Users can never set it.
  const service = createAdminClient();
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: {
      wemuste_role: "employer",
      company_name: companyName,
      contact_person: contactPerson,
      contact_phone: phone,
      trade_license_no: tradeLicenseNo || null,
      website: website || null,
      created_by: admin.id,
    },
  });
  if (error || !data.user) {
    if (error?.code === "email_exists" || error?.code === "user_already_exists") {
      return fail("emailTaken", { email: "validation.emailTaken" });
    }
    logError("admin-create-sponsor", error);
    return fail("generic");
  }

  // They must choose their own password first.
  const { error: flagError } = await service
    .from("employer_profiles")
    .update({ must_change_password: true })
    .eq("user_id", data.user.id);
  if (flagError) {
    await service.auth.admin.deleteUser(data.user.id);
    return dbFail("admin-create-sponsor-flag", flagError);
  }

  // Approve as the admin (user-scoped client) so the audit log names them.
  const { error: approveError } = await supabase.rpc("admin_set_employer_status", {
    p_employer_id: data.user.id,
    p_status: "approved",
  });
  if (approveError) return dbFail("admin-approve-sponsor", approveError);

  const emailed = await sendSetupLink(email);
  revalidatePath("/admin/sponsors");
  return ok({ email, companyName, emailed });
}

// Deletes a sponsor account with its logo, jobs and every application to
// those jobs (including the videos). This cannot be undone.
export async function deleteSponsor(employerId: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(employerId);
  if (!parsed.success) return fail("invalidInput");
  await requireAdminMfa();
  const supabase = await createClient();
  const { error: logErr } = await supabase.rpc("log_sponsor_change", {
    p_employer_id: parsed.data,
    p_change: "deleted",
  });
  if (logErr) return dbFail("admin-delete-sponsor-log", logErr);

  // Files first (videos, CVs, logo), then the login, which cascades through
  // the jobs and applications. Service role: only it can do either.
  await removeSponsorFiles(parsed.data);
  const service = createAdminClient();
  const { error } = await service.auth.admin.deleteUser(parsed.data);
  if (error) {
    logError("admin-delete-sponsor", error);
    return fail("generic");
  }
  revalidatePath("/admin/sponsors");
  revalidatePath("/");
  redirect("/admin/sponsors?deleted=1");
}

export async function setEmployerStatus(input: unknown): Promise<ActionResult> {
  const parsed = employerStatusSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput");
  await requireAdminMfa();

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_employer_status", {
    p_employer_id: parsed.data.employerId,
    p_status: parsed.data.status,
  });
  if (error) return dbFail("admin-employer-status", error);
  revalidatePath("/admin/sponsors", "layout");
  revalidatePath("/");
  return ok(undefined);
}

// Adds (or with a negative amount, takes back) E-coins. Audited in the database.
export async function addEcoins(input: unknown): Promise<ActionResult<{ balance: number }>> {
  const parsed = ecoinSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput");
  await requireAdminMfa();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_add_ecoins", {
    p_employer_id: parsed.data.employerId,
    p_amount: parsed.data.amount,
    p_note: parsed.data.note,
  });
  if (error) return dbFail("admin-add-ecoins", error);
  revalidatePath(`/admin/sponsors/${parsed.data.employerId}`);
  return ok({ balance: data });
}

// "Resend invite": a new link to choose their password (the old link and
// their current password keep working until they use it).
export async function resendSponsorInvite(
  employerId: unknown,
): Promise<ActionResult<{ emailed: boolean }>> {
  const id = idSchema.safeParse(employerId);
  if (!id.success) return fail("invalidInput");
  await requireAdminMfa();
  const supabase = await createClient();
  const { data: sponsor } = await supabase
    .from("employer_profiles")
    .select("contact_email")
    .eq("user_id", id.data)
    .maybeSingle();
  if (!sponsor?.contact_email) return fail("notFound");
  const { error: logErr } = await supabase.rpc("log_sponsor_change", {
    p_employer_id: id.data,
    p_change: "invite",
  });
  if (logErr) return dbFail("admin-sponsor-invite-log", logErr);
  return ok({ emailed: await sendSetupLink(sponsor.contact_email) });
}

const BAN: Record<(typeof SPONSOR_BLOCKS)[number], string> = {
  "1d": "24h",
  "7d": "168h",
  "30d": "720h",
  forever: "876000h",
  none: "none",
};

// Blocks a sponsor's login for a while (or until unblocked), or unblocks.
// Blocking also ends every session at once.
export async function blockSponsor(input: unknown): Promise<ActionResult> {
  const parsed = blockSponsorSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput");
  await requireAdminMfa();
  const { employerId, duration } = parsed.data;
  const { error: logErr } = await (
    await createClient()
  ).rpc("log_sponsor_change", {
    p_employer_id: employerId,
    p_change: duration === "none" ? "unblocked" : "blocked",
  });
  if (logErr) return dbFail("admin-block-sponsor-log", logErr);
  // Service role: only it can block another user's login.
  const { error } = await createAdminClient().auth.admin.updateUserById(employerId, {
    ban_duration: BAN[duration],
  });
  if (error) {
    logError("admin-block-sponsor", error);
    return fail("generic");
  }
  if (duration !== "none") await revokeSessions(employerId);
  revalidatePath(`/admin/sponsors/${employerId}`);
  return ok(undefined);
}
