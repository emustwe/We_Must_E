"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdminMfa } from "@/lib/auth/session";
import { dbFail } from "@/lib/db-errors";
import { logError } from "@/lib/log";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { toFieldErrors } from "@/lib/validations/auth";
import { createEmployerSchema, employerStatusSchema } from "@/lib/validations/jobs";

// Unambiguous characters so credentials can be read out or typed from paper.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
function temporaryPassword() {
  const chunk = () =>
    Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `${chunk()}-${chunk()}-${chunk()}-${chunk()}`;
}

export type CreatedEmployer = { email: string; temporaryPassword: string; companyName: string };

export async function createEmployer(input: unknown): Promise<ActionResult<CreatedEmployer>> {
  const parsed = createEmployerSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput", toFieldErrors(parsed.error));
  const admin = await requireAdminMfa();
  const { companyName, contactPerson, email, phone, tradeLicenseNo, website } = parsed.data;
  const password = temporaryPassword();

  // Service role is required here: only it can create a user and set
  // app_metadata.wemuste_role, which is what makes the account an employer.
  // Users can never set app_metadata themselves.
  const { data, error } = await createAdminClient().auth.admin.createUser({
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
    logError("admin-create-employer", error);
    return fail("generic");
  }

  // Approve as the admin (user-scoped client) so the audit log names them.
  const supabase = await createClient();
  const { error: approveError } = await supabase.rpc("admin_set_employer_status", {
    p_employer_id: data.user.id,
    p_status: "approved",
  });
  if (approveError) return dbFail("admin-approve-employer", approveError);

  revalidatePath("/admin/employers");
  return ok({ email, temporaryPassword: password, companyName });
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
