import "server-only";
import { logError } from "@/lib/log";
import { createAdminClient } from "@/lib/supabase/admin";

// Clears a sponsor's "choose your own password" flag. Service role: only the
// server may clear it, and only right after the password really changed, so a
// sponsor can't skip the change by calling the database directly.
export async function completePasswordChange(userId: string) {
  const { error } = await createAdminClient()
    .from("employer_profiles")
    .update({ must_change_password: false })
    .eq("user_id", userId)
    .eq("must_change_password", true);
  if (error) logError("complete-password-change", error);
  return !error;
}

// Ends every session of a user (after an admin sets a new password), so a
// session opened with the old password can't carry on. Service role: it acts
// on another user's sessions.
export async function revokeSessions(userId: string) {
  const { error } = await createAdminClient().rpc("admin_revoke_sessions", { p_user_id: userId });
  if (error) logError("revoke-sessions", error);
  return !error;
}
