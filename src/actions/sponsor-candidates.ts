"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { dbFail } from "@/lib/db-errors";
import { logError } from "@/lib/log";
import { fail, ok, type ActionResult } from "@/lib/result";
import { withinRateLimit } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { videoViewSchema } from "@/lib/validations/admin";
import { idSchema } from "@/lib/validations/jobs";
import { CV_BUCKET, VIDEO_BUCKET } from "@/server/public-application";

// A 5-minute link to one of an unlocked candidate's videos. The database
// checks access, rate-limits and logs the view, and only then returns the
// file's path; sponsors can't read the files any other way.
export async function getCandidateVideoUrl(input: unknown): Promise<ActionResult<{ url: string }>> {
  const parsed = videoViewSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput");
  const profile = await requireRole("employer");
  if (!(await withinRateLimit("mediaViewPerEmployer", profile.id))) return fail("rateLimited");
  const supabase = await createClient();
  const { data: path, error: logErr } = await supabase.rpc("log_video_view", {
    p_video_id: parsed.data.videoId,
  });
  if (logErr) return dbFail("sponsor-video-view", logErr);
  if (!path) return fail("notFound");
  return signedLink(VIDEO_BUCKET, path, false);
}

// Service role: sponsors have no storage access of their own. Called only
// with a path the database returned after checking and logging the view.
async function signedLink(
  bucket: string,
  path: string,
  download: boolean,
): Promise<ActionResult<{ url: string }>> {
  const { data, error } = await createAdminClient()
    .storage.from(bucket)
    .createSignedUrl(path, 300, download ? { download: true } : undefined);
  if (error || !data) {
    logError("sponsor-media-url", error);
    return fail("generic");
  }
  return ok({ url: data.signedUrl });
}

// Spends 1 E-coin to open an approved candidate for good.
export async function unlockCandidate(
  applicationId: unknown,
): Promise<ActionResult<{ balance: number }>> {
  const parsed = idSchema.safeParse(applicationId);
  if (!parsed.success) return fail("invalidInput");
  await requireRole("employer");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sponsor_unlock_candidate", {
    p_application_id: parsed.data,
  });
  if (error) return dbFail("sponsor-unlock", error);
  revalidatePath("/sponsor", "layout");
  return ok({ balance: data });
}

// A 5-minute link to an unlocked candidate's CV (checked and logged first).
export async function getCandidateCvUrl(
  applicationId: unknown,
): Promise<ActionResult<{ url: string }>> {
  const parsed = idSchema.safeParse(applicationId);
  if (!parsed.success) return fail("invalidInput");
  const profile = await requireRole("employer");
  if (!(await withinRateLimit("mediaViewPerEmployer", profile.id))) return fail("rateLimited");
  const supabase = await createClient();
  const { data: path, error: logErr } = await supabase.rpc("log_cv_view", {
    p_application_id: parsed.data,
  });
  if (logErr) return dbFail("sponsor-cv-view", logErr);
  if (!path) return fail("notFound");
  return signedLink(CV_BUCKET, path, true);
}
