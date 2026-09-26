"use server";

import { redirect } from "next/navigation";
import { z } from "@/lib/validations/zod";
import { getCurrentProfile } from "@/lib/auth/session";
import { dbFail } from "@/lib/db-errors";
import { logError } from "@/lib/log";
import { fail, type ActionResult } from "@/lib/result";
import { removeSponsorFiles } from "@/lib/sponsors/cleanup";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const confirmSchema = z.strictObject({ confirm: z.literal("DELETE") });

// Deletes the signed-in employer's account: the auth user, which cascades
// through their jobs. Audit entries stay, pseudonymous.
export async function deleteAccount(input: unknown): Promise<ActionResult> {
  if (!confirmSchema.safeParse(input).success) return fail("invalidInput");
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role === "admin") return fail("forbidden");

  const supabase = await createClient();
  const { error: auditError } = await supabase.rpc("record_account_deletion");
  if (auditError) return dbFail("record-account-deletion", auditError);

  // Service role: deleting the auth user can't be done with the user's own
  // session. The id comes from the session, never from input.
  // Files first (candidates' videos and CVs, the logo): the database cascade
  // can't remove them.
  if (profile.role === "employer") await removeSponsorFiles(profile.id);
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(profile.id);
  if (error) {
    logError("delete-account-user", error);
    return fail("generic");
  }

  // The session is already invalid; this clears the cookies.
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  redirect("/login?deleted=1");
}
