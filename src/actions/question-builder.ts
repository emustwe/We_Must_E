"use server";

import { revalidatePath } from "next/cache";
import { requireAdminMfa } from "@/lib/auth/session";
import { dbFail } from "@/lib/db-errors";
import { buildTest, buildVideos, type TestQ } from "@/lib/question-builder/template";
import { fail, ok, type ActionResult } from "@/lib/result";
import { withinRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import {
  attachQuestionBuildSchema,
  generateQuestionsSchema,
  saveQuestionBuildSchema,
} from "@/lib/validations/question-builder";
import { generateRole } from "@/server/question-builder";

export type GeneratedInterview = {
  role: Record<string, string>;
  test: TestQ[];
  videos: string[];
};

// An MFA admin pastes a job; the AI writes the job's own content and the
// template turns it into 25 test questions and 7 video questions (not saved
// yet: the admin reviews and edits them first).
export async function generateQuestions(input: unknown): Promise<ActionResult<GeneratedInterview>> {
  const parsed = generateQuestionsSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput");
  const profile = await requireAdminMfa();
  if (!(await withinRateLimit("questionAiPerAdmin", profile.id))) return fail("rateLimited");
  const result = await generateRole(parsed.data.title, parsed.data.description);
  if (!result.ok) return fail(result.error);
  return ok({
    role: result.role as unknown as Record<string, string>,
    test: buildTest(result.role),
    videos: buildVideos(result.role),
  });
}

// Saves the reviewed questions as a Test and a Video interview.
export async function saveQuestionBuild(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = saveQuestionBuildSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput");
  await requireAdminMfa();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_save_question_build", {
    p_title: parsed.data.title,
    p_description: parsed.data.description,
    p_role: parsed.data.role,
    p_test: parsed.data.test,
    p_videos: parsed.data.videos,
  });
  if (error || !data) return error ? dbFail("admin-save-question-build", error) : fail("generic");
  revalidatePath("/admin/questions");
  return ok({ id: data });
}

// Attaches a saved interview to a sponsor's job that is waiting for approval.
export async function attachQuestionBuild(input: unknown): Promise<ActionResult> {
  const parsed = attachQuestionBuildSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput");
  await requireAdminMfa();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_attach_question_build", {
    p_build_id: parsed.data.buildId,
    p_job_id: parsed.data.jobId,
  });
  if (error) return dbFail("admin-attach-question-build", error);
  revalidatePath(`/admin/questions/${parsed.data.buildId}`);
  revalidatePath("/admin/jobs");
  return ok(undefined);
}
