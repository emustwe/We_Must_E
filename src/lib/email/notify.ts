import "server-only";
import { after } from "next/server";
import type { EmailKind } from "@/emails/templates";
import { sendEmail } from "@/lib/email/send";
import { logError } from "@/lib/log";
import { createAdminClient } from "@/lib/supabase/admin";

// Queues an email to a user after the response is sent, so actions stay fast
// and an email failure never breaks the action.
// The service role is used only to look up the recipient's login email:
// employers must not read job seekers' addresses (and vice versa), but the
// notification still has to reach them.
export function notifyUser(kind: EmailKind, userId: string) {
  after(async () => {
    const { data, error } = await createAdminClient().auth.admin.getUserById(userId);
    if (error || !data.user?.email) {
      logError(`notify-${kind}`, error ?? { name: "NoEmail" });
      return;
    }
    await sendEmail(kind, data.user.email);
  });
}
