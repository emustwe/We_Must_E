"use server";

import { revalidatePath } from "next/cache";
import { requireAdminMfa } from "@/lib/auth/session";
import { dbFail } from "@/lib/db-errors";
import { clientEnv } from "@/lib/env";
import { logError } from "@/lib/log";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { toFieldErrors } from "@/lib/validations/auth";
import { idSchema } from "@/lib/validations/jobs";
import { createEmployerSchema, employerStatusSchema } from "@/lib/validations/jobs";

const inviteRedirect = () => `${clientEnv.NEXT_PUBLIC_SITE_URL}/auth/confirm?type=invite`;

export type InvitedEmployer = { email: string; companyName: string };

// Invites an employer by email. They set their own password from the link.
export async function createEmployer(input: unknown): Promise<ActionResult<InvitedEmployer>> {
  const parsed = createEmployerSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput", toFieldErrors(parsed.error));
  const admin = await requireAdminMfa();
  const { companyName, contactPerson, email, phone, tradeLicenseNo, website } = parsed.data;

  // Supabase re-sends the invite for an address that was already invited
  // instead of failing, so refuse duplicates explicitly.
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("employer_profiles")
    .select("user_id")
    .eq("contact_email", email) // emails are stored and validated lowercase
    .limit(1);
  if (existing?.length) return fail("emailTaken", { email: "validation.emailTaken" });

  // Service role is required: only it can invite users and set
  // app_metadata.wemuste_role, which is what makes the account an employer.
  // Users can never set app_metadata themselves.
  const service = createAdminClient();
  const { data, error } = await service.auth.admin.inviteUserByEmail(email, {
    redirectTo: inviteRedirect(),
  });
  if (error || !data.user) {
    if (error?.code === "email_exists" || error?.code === "user_already_exists") {
      return fail("emailTaken", { email: "validation.emailTaken" });
    }
    logError("admin-invite-employer", error);
    return fail("generic");
  }

  // Setting the role provisions the employer profile (database trigger).
  const { error: roleError } = await service.auth.admin.updateUserById(data.user.id, {
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
  if (roleError) {
    logError("admin-invite-employer-role", roleError);
    await service.auth.admin.deleteUser(data.user.id);
    return fail("generic");
  }

  // Approve as the admin (user-scoped client) so the audit log names them.
  const { error: approveError } = await supabase.rpc("admin_set_employer_status", {
    p_employer_id: data.user.id,
    p_status: "approved",
  });
  if (approveError) return dbFail("admin-approve-employer", approveError);

  revalidatePath("/admin/employers");
  return ok({ email, companyName });
}

// Sends the invite again to an employer who hasn't set a password yet.
export async function resendEmployerInvite(employerId: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(employerId);
  if (!parsed.success) return fail("invalidInput");
  await requireAdminMfa();

  const supabase = await createClient();
  const { data: employer } = await supabase
    .from("employer_profiles")
    .select("contact_email, must_change_password")
    .eq("user_id", parsed.data)
    .maybeSingle();
  if (!employer?.contact_email) return fail("notFound");
  if (!employer.must_change_password) return fail("alreadyActive");

  // Service role: invites can only be sent by the service role.
  const { error } = await createAdminClient().auth.admin.inviteUserByEmail(employer.contact_email, {
    redirectTo: inviteRedirect(),
  });
  if (error) {
    logError("admin-resend-invite", error);
    return fail("generic");
  }
  return ok(undefined);
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
  revalidatePath("/admin/employers");
  return ok(undefined);
}
