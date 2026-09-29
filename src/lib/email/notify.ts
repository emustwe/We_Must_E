import "server-only";
import { after } from "next/server";
import { sendEmail } from "@/lib/email/send";
import { serverEnv } from "@/lib/env.server";
import { logError } from "@/lib/log";
import { createAdminClient } from "@/lib/supabase/admin";

const PARTNER_ACCOUNT_EMAIL = "practice-jobs@wemuste.com";

type SponsorEmail = "jobApproved" | "jobRejected" | "newCandidate" | "paymentReceived";

// Emails go out after the response, so an email problem never breaks an action.

export function notifyAdmins(
  kind: "newApplication" | "newJob" | "newSponsorRequest" | "newPayment",
) {
  const to = serverEnv.ADMIN_NOTIFY_EMAIL;
  if (to) after(() => sendEmail(kind, to));
}

// The service role is used only to look up the sponsor's login email.
export function notifySponsor(kind: SponsorEmail, sponsorId: string) {
  after(async () => {
    const { data, error } = await createAdminClient().auth.admin.getUserById(sponsorId);
    if (error || !data.user?.email) {
      logError(`notify-${kind}`, error ?? { name: "NoEmail" });
      return;
    }
    // The internal partner-jobs account has no inbox.
    if (data.user.email === PARTNER_ACCOUNT_EMAIL) return;
    await sendEmail(kind, data.user.email);
  });
}
