"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { dbFail } from "@/lib/db-errors";
import { logError } from "@/lib/log";
import { fail, ok, type ActionResult } from "@/lib/result";
import { withinRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { videoViewSchema } from "@/lib/validations/admin";
import { idSchema } from "@/lib/validations/jobs";

// A 5-minute link to one of an approved candidate's videos. Runs as the
// sponsor: the database only allows approved candidates for their own jobs,
// and logs the view before the link is made.
export async function getCandidateVideoUrl(input: unknown): Promise<ActionResult<{ url: string }>> {
  const parsed = videoViewSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput");
  const profile = await requireRole("employer");
  if (!(await withinRateLimit("mediaViewPerEmployer", profile.id))) return fail("rateLimited");
  const supabase = await createClient();
  const { videoId } = parsed.data;
  const { data: video } = await supabase
    .from("application_videos")
    .select("storage_path")
    .eq("id", videoId)
    .maybeSingle();
  if (!video) return fail("notFound");
  const { error: logErr } = await supabase.rpc("log_video_view", { p_video_id: videoId });
  if (logErr) return dbFail("sponsor-video-view", logErr);
  const { data, error } = await supabase.storage
    .from("application-videos")
    .createSignedUrl(video.storage_path, 300);
  if (error || !data) {
    logError("sponsor-video-url", error);
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
