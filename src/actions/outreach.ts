"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile, requireAdminMfa } from "@/lib/auth/session";
import { dbFail } from "@/lib/db-errors";
import { isOutreachToken } from "@/lib/outreach/config";
import { fail, ok, type ActionResult } from "@/lib/result";
import { getIpHash } from "@/lib/security/ip";
import { withinRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { outreachAddSchema, outreachUpdateSchema } from "@/lib/validations/outreach";
import { recordOutreachOpened, unsubscribeOutreach } from "@/server/outreach";

// An MFA admin adds contacts (emails already in the list are skipped).
export async function addOutreachContacts(
  input: unknown,
): Promise<ActionResult<{ added: number; skipped: number }>> {
  const parsed = outreachAddSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput");
  await requireAdminMfa();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_outreach_add", {
    p_contacts: parsed.data.contacts,
    p_salesperson_id: parsed.data.salespersonId || undefined,
  });
  if (error || !data?.[0]) return error ? dbFail("admin-outreach-add", error) : fail("generic");
  revalidatePath("/admin/outreach");
  return ok({ added: data[0].added, skipped: data[0].skipped });
}

// An MFA admin marks the email sent, turns the link off or on, or deletes.
export async function updateOutreachContact(input: unknown): Promise<ActionResult> {
  const parsed = outreachUpdateSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput");
  await requireAdminMfa();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_outreach_update", {
    p_id: parsed.data.id,
    p_action: parsed.data.action,
  });
  if (error) return dbFail("admin-outreach-update", error);
  revalidatePath("/admin/outreach");
  return ok(undefined);
}

// The video page was opened in a browser (not counted for admins' previews).
export async function outreachPageOpened(token: unknown): Promise<void> {
  if (!isOutreachToken(token)) return;
  if ((await getCurrentProfile())?.role === "admin") return;
  if (!(await withinRateLimit("outreachPerIp", await getIpHash()))) return;
  await recordOutreachOpened(token);
}

// "Don't email me again".
export async function outreachUnsubscribe(token: unknown): Promise<ActionResult> {
  if (!isOutreachToken(token)) return fail("invalidInput");
  if (!(await withinRateLimit("outreachPerIp", await getIpHash()))) return fail("rateLimited");
  if (!(await unsubscribeOutreach(token))) return fail("notFound");
  return ok(undefined);
}
