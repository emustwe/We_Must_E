"use server";

import { revalidatePath } from "next/cache";
import { requireAdminMfa } from "@/lib/auth/session";
import { dbFail } from "@/lib/db-errors";
import { notifyAdmins } from "@/lib/email/notify";
import { logError } from "@/lib/log";
import { fail, ok, type ActionResult } from "@/lib/result";
import { getIpHash } from "@/lib/security/ip";
import { withinRateLimit } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { toFieldErrors } from "@/lib/validations/auth";
import {
  handleSponsorRequestSchema,
  sponsorRequestSchema,
} from "@/lib/validations/sponsor-request";
import { markOutreachSignedUp } from "@/server/outreach";
import { verifyTurnstile } from "@/server/public-application/turnstile";

// "Become a sponsor": anyone can ask. Checked, rate-limited and bot-tested,
// then saved for the team (who are emailed, without any details).
export async function requestSponsorship(input: unknown): Promise<ActionResult> {
  const parsed = sponsorRequestSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput", toFieldErrors(parsed.error));
  const ipHash = await getIpHash();
  if (!(await withinRateLimit("sponsorRequestPerIp", ipHash))) return fail("rateLimited");
  if (!(await verifyTurnstile(parsed.data.captchaToken))) return fail("captchaFailed");
  const r = parsed.data;
  // Service role: nobody outside the team may write or read requests (or
  // the salespeople) directly; the checks above ran first.
  const service = createAdminClient();
  let salespersonId: string | null = null;
  if (r.referralCode) {
    const { data: person } = await service
      .from("sales_people")
      .select("id")
      .eq("code", r.referralCode.toUpperCase())
      .maybeSingle();
    if (!person) return fail("invalidInput", { referralCode: "validation.referralUnknown" });
    salespersonId = person.id;
  }
  const { error } = await service.from("sponsor_requests").insert({
    company_name: r.companyName || r.contactPerson,
    contact_person: r.contactPerson,
    email: r.email,
    phone: r.phone,
    city: r.city,
    website: r.website || null,
    message: r.message || null,
    salesperson_id: salespersonId,
    ip_hash: ipHash,
  });
  if (error) {
    logError("sponsor-request", error);
    return fail("generic");
  }
  // A company we emailed (from its link, or with the same email) signed up.
  await markOutreachSignedUp(r.outreachToken || null, r.email);
  notifyAdmins("newSponsorRequest");
  return ok(undefined);
}

// An MFA admin marks a request approved (after creating the account) or declined.
export async function handleSponsorRequest(input: unknown): Promise<ActionResult> {
  const parsed = handleSponsorRequestSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput");
  await requireAdminMfa();
  const { error } = await (
    await createClient()
  ).rpc("admin_handle_sponsor_request", {
    p_request_id: parsed.data.requestId,
    p_status: parsed.data.status,
  });
  if (error) return dbFail("admin-sponsor-request", error);
  revalidatePath("/admin", "layout");
  return ok(undefined);
}

// An MFA admin deletes a request (kept until then).
export async function deleteSponsorRequest(requestId: unknown): Promise<ActionResult> {
  const id = handleSponsorRequestSchema.shape.requestId.safeParse(requestId);
  if (!id.success) return fail("invalidInput");
  await requireAdminMfa();
  const { error } = await (
    await createClient()
  ).rpc("admin_delete_sponsor_request", {
    p_request_id: id.data,
  });
  if (error) return dbFail("admin-delete-sponsor-request", error);
  revalidatePath("/admin", "layout");
  return ok(undefined);
}
