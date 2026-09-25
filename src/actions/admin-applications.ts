"use server";

import { revalidatePath } from "next/cache";
import { requireAdminMfa } from "@/lib/auth/session";
import { dbFail } from "@/lib/db-errors";
import { notifySponsor } from "@/lib/email/notify";
import { logError } from "@/lib/log";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import { toFieldErrors } from "@/lib/validations/auth";
import { gradeSchema, reviewSchema, videoViewSchema } from "@/lib/validations/admin";

const VIDEO_URL_SECONDS = 300;

// All of these run as the admin (MFA session), so RLS and the audited
// database functions apply; nothing here uses the service role.
async function admin() {
  await requireAdminMfa();
  return createClient();
}

export async function reviewApplication(input: unknown): Promise<ActionResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput", toFieldErrors(parsed.error));
  const supabase = await admin();
  const { applicationId, decision, notes } = parsed.data;
  const { error } = await supabase.rpc("admin_review_application", {
    p_application_id: applicationId,
    p_decision: decision,
    p_notes: notes,
  });
  if (error) return dbFail("admin-review-application", error);
  // The sponsor who posted the job is told there's a new candidate.
  if (decision === "approved") {
    const { data: app } = await supabase
      .from("applications")
      .select("jobs(employer_id)")
      .eq("id", applicationId)
      .maybeSingle();
    if (app?.jobs?.employer_id) notifySponsor("newCandidate", app.jobs.employer_id);
  }
  revalidatePath("/admin/applications", "layout");
  return ok(undefined);
}

export async function gradeAnswer(input: unknown): Promise<ActionResult> {
  const parsed = gradeSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput");
  const supabase = await admin();
  const { applicationId, questionId, points } = parsed.data;
  const { error } = await supabase.rpc("admin_grade_answer", {
    p_application_id: applicationId,
    p_question_id: questionId,
    p_points: points,
  });
  if (error) return dbFail("admin-grade-answer", error);
  revalidatePath(`/admin/applications/${applicationId}`);
  return ok(undefined);
}

// A 5-minute link to one video. The view is logged before the link is made.
export async function getVideoUrl(input: unknown): Promise<ActionResult<{ url: string }>> {
  const parsed = videoViewSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput");
  const supabase = await admin();
  const { applicationId, questionId } = parsed.data;
  const { data: video } = await supabase
    .from("application_videos")
    .select("storage_path")
    .eq("application_id", applicationId)
    .eq("question_id", questionId)
    .maybeSingle();
  if (!video) return fail("notFound");
  const { error: logErr } = await supabase.rpc("log_video_view", {
    p_application_id: applicationId,
    p_question_id: questionId,
  });
  if (logErr) return dbFail("admin-video-view", logErr);
  const { data, error } = await supabase.storage
    .from("application-videos")
    .createSignedUrl(video.storage_path, VIDEO_URL_SECONDS);
  if (error || !data) {
    logError("admin-video-url", error);
    return fail("generic");
  }
  return ok({ url: data.signedUrl });
}
