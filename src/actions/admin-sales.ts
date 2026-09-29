"use server";

import { revalidatePath } from "next/cache";
import { requireAdminMfa } from "@/lib/auth/session";
import { dbFail } from "@/lib/db-errors";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import { toFieldErrors } from "@/lib/validations/auth";
import { salespersonSchema } from "@/lib/validations/sponsor-request";

// An MFA admin creates a salesperson: a referral code (kept in capitals) and
// a nickname. Codes are unique. Audited in the database.
export async function createSalesperson(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = salespersonSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput", toFieldErrors(parsed.error));
  await requireAdminMfa();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_create_salesperson", {
    p_code: parsed.data.code,
    p_nickname: parsed.data.nickname,
  });
  if (error?.message === "code_taken") {
    return fail("invalidInput", { code: "validation.codeTaken" });
  }
  if (error || !data) return error ? dbFail("admin-create-salesperson", error) : fail("generic");
  revalidatePath("/admin/sales");
  return ok({ id: data });
}
