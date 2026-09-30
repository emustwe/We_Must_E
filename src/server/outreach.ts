import "server-only";
import { isOutreachToken } from "@/lib/outreach/config";
import { logError } from "@/lib/log";
import { createAdminClient } from "@/lib/supabase/admin";

// The private video page and "Become a sponsor" read outreach contacts by
// their link. The service role is used because visitors have no account: the
// database only answers for a valid, still-working link, and these functions
// are executable by the service role only.

export type OutreachContact = {
  name: string;
  company: string;
  email: string;
  referral_code: string | null;
};

export async function outreachByToken(token: unknown): Promise<OutreachContact | null> {
  if (!isOutreachToken(token)) return null;
  const { data, error } = await createAdminClient().rpc("outreach_view", { p_token: token });
  if (error) logError("outreach-view", error);
  return data?.[0] ?? null;
}

export async function recordOutreachOpened(token: string) {
  const { error } = await createAdminClient().rpc("outreach_opened", { p_token: token });
  if (error) logError("outreach-opened", error);
}

export async function unsubscribeOutreach(token: string) {
  const { data, error } = await createAdminClient().rpc("outreach_unsubscribe", {
    p_token: token,
  });
  if (error) logError("outreach-unsubscribe", error);
  return Boolean(data);
}

export async function markOutreachSignedUp(token: string | null, email: string) {
  const { error } = await createAdminClient().rpc("outreach_signed_up", {
    p_token: token ?? "",
    p_email: email,
  });
  if (error) logError("outreach-signed-up", error);
}
