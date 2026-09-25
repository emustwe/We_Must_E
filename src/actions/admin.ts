"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminMfa } from "@/lib/auth/session";
import { dbFail } from "@/lib/db-errors";
import { sendEmail } from "@/lib/email/send";
import { generatePassword } from "@/lib/generate-password";
import { logError } from "@/lib/log";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { toFieldErrors } from "@/lib/validations/auth";
import {
  createEmployerSchema,
  ecoinSchema,
  employerStatusSchema,
  idSchema,
  sponsorPasswordSchema,
} from "@/lib/validations/jobs";
import { VIDEO_BUCKET } from "@/server/public-application";

export type CreatedSponsor = { email: string; companyName: string; emailed: boolean };

const passwordError = (code?: string) =>
  code === "weak_password" ? fail("weakPassword", { password: "validation.passwordWeak" }) : null;

// Creates a sponsor with the password the admin chose, approves it and emails
// the login details (the sponsor keeps this password until they change it).
export async function createEmployer(input: unknown): Promise<ActionResult<CreatedSponsor>> {
  const parsed = createEmployerSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput", toFieldErrors(parsed.error));
  const admin = await requireAdminMfa();
  const { companyName, contactPerson, email, password, phone, tradeLicenseNo, website } =
    parsed.data;

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
    const weak = passwordError(error?.code);
    if (weak) return weak;
    logError("admin-create-sponsor", error);
    return fail("generic");
  }

  // The admin chose the password, so there is no forced change at first login.
  const { error: flagError } = await service
    .from("employer_profiles")
    .update({ must_change_password: false })
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

  const emailed = await sendEmail("sponsorAccount", email, { email, password });
  revalidatePath("/admin/sponsors");
  return ok({ email, companyName, emailed });
}

// Sets a new password for a sponsor, optionally emailing it to them.
export async function setSponsorPassword(
  input: unknown,
): Promise<ActionResult<{ emailed: boolean }>> {
  const parsed = sponsorPasswordSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput", toFieldErrors(parsed.error));
  await requireAdminMfa();
  const { employerId, password, notify } = parsed.data;

  const supabase = await createClient();
  const { data: sponsor } = await supabase
    .from("employer_profiles")
    .select("contact_email")
    .eq("user_id", employerId)
    .maybeSingle();
  if (!sponsor?.contact_email) return fail("notFound");
  // Log first, as the admin, so the audit names who did it.
  const { error: logErr } = await supabase.rpc("log_sponsor_change", {
    p_employer_id: employerId,
    p_change: "password",
  });
  if (logErr) return dbFail("admin-sponsor-password-log", logErr);

  // Service role: only it can change another user's password.
  const service = createAdminClient();
  const { error } = await service.auth.admin.updateUserById(employerId, { password });
  if (error) {
    const weak = passwordError(error.code);
    if (weak) return weak;
    logError("admin-sponsor-password", error);
    return fail("generic");
  }
  // The admin chose it: no forced change at the next login.
  await service
    .from("employer_profiles")
    .update({ must_change_password: false })
    .eq("user_id", employerId);
  const emailed = notify
    ? await sendEmail("sponsorPassword", sponsor.contact_email, {
        email: sponsor.contact_email,
        password,
      })
    : false;
  return ok({ emailed });
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

  // Service role: files and the login can only be removed with it.
  const service = createAdminClient();
  const { data: apps } = await service
    .from("applications")
    .select("id, jobs!inner(employer_id)")
    .eq("jobs.employer_id", parsed.data);
  const { data: videos } = apps?.length
    ? await service
        .from("application_videos")
        .select("storage_path")
        .in(
          "application_id",
          apps.map((a) => a.id),
        )
    : { data: [] };
  if (videos?.length) {
    await service.storage.from(VIDEO_BUCKET).remove(videos.map((v) => v.storage_path));
  }
  const { data: logos } = await service.storage.from("sponsor-logos").list(parsed.data);
  if (logos?.length) {
    await service.storage
      .from("sponsor-logos")
      .remove(logos.map((l) => `${parsed.data}/${l.name}`));
  }
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

// "Resend invite": sponsors don't get an invite link, they get a password the
// admin sets. Resending makes a new one and emails it with the login link
// (logged as a password change; the old password stops working).
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
    p_change: "password",
  });
  if (logErr) return dbFail("admin-sponsor-invite-log", logErr);

  const password = generatePassword();
  // Service role: only it can change another user's password.
  const service = createAdminClient();
  const { error } = await service.auth.admin.updateUserById(id.data, { password });
  if (error) {
    logError("admin-sponsor-invite", error);
    return fail("generic");
  }
  await service
    .from("employer_profiles")
    .update({ must_change_password: false })
    .eq("user_id", id.data);
  const emailed = await sendEmail("sponsorAccount", sponsor.contact_email, {
    email: sponsor.contact_email,
    password,
  });
  return ok({ emailed });
}
