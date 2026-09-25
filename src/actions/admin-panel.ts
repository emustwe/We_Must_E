"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminMfa } from "@/lib/auth/session";
import { dbFail } from "@/lib/db-errors";
import { notifySponsor } from "@/lib/email/notify";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import { toFieldErrors } from "@/lib/validations/auth";
import {
  adminJobStatusSchema,
  jobReviewSchema,
  promptSchema,
  surveyQuestionSchema,
  surveySchema,
  swapSchema,
  testQuestionSchema,
  testSchema,
  videoSetSchema,
} from "@/lib/validations/admin";
import { idSchema } from "@/lib/validations/jobs";

// Every action: validate, require an MFA admin, then use the admin's own
// session so RLS (which also requires aal2) and the audited RPCs apply.
async function admin() {
  await requireAdminMfa();
  return createClient();
}

// ---------------------------------------------------------------- jobs
export async function adminSetJobStatus(input: unknown): Promise<ActionResult> {
  const parsed = adminJobStatusSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput");
  const supabase = await admin();
  const { error } = await supabase.rpc("admin_set_job_status", {
    p_job_id: parsed.data.jobId,
    p_status: parsed.data.status,
  });
  if (error) return dbFail("admin-job-status", error);
  revalidatePath("/admin/jobs");
  revalidatePath("/");
  return ok(undefined);
}

// Approve a sponsor's job (it goes live on the map) or send it back with a reason.
export async function adminReviewJob(input: unknown): Promise<ActionResult> {
  const parsed = jobReviewSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput");
  const supabase = await admin();
  const { jobId, approve, note } = parsed.data;
  const { data: job } = await supabase
    .from("jobs")
    .select("employer_id")
    .eq("id", jobId)
    .maybeSingle();
  if (!job) return fail("notFound");
  const { error } = await supabase.rpc("admin_review_job", {
    p_job_id: jobId,
    p_approve: approve,
    p_note: note,
  });
  if (error) return dbFail("admin-review-job", error);
  notifySponsor(approve ? "jobApproved" : "jobRejected", job.employer_id);
  revalidatePath("/admin/jobs");
  revalidatePath("/admin");
  revalidatePath("/");
  return ok(undefined);
}

// ---------------------------------------------------------------- surveys
export async function createSurvey(input: unknown): Promise<ActionResult> {
  const parsed = surveySchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput", toFieldErrors(parsed.error));
  const supabase = await admin();
  const { data, error } = await supabase
    .from("surveys")
    .insert({ title: parsed.data.title })
    .select("id")
    .single();
  if (error) return dbFail("create-survey", error);
  redirect(`/admin/content/surveys/${data.id}`);
}

export async function updateSurvey(surveyId: unknown, input: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(surveyId);
  const parsed = surveySchema.safeParse(input);
  if (!id.success || !parsed.success) return fail("invalidInput");
  const supabase = await admin();
  const { error } = await supabase
    .from("surveys")
    .update({ title: parsed.data.title })
    .eq("id", id.data);
  if (error) return dbFail("update-survey", error);
  revalidatePath(`/admin/content/surveys/${id.data}`);
  return ok(undefined);
}

export async function activateSurvey(surveyId: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(surveyId);
  if (!id.success) return fail("invalidInput");
  const supabase = await admin();
  const { error } = await supabase.rpc("admin_activate_survey", { p_survey_id: id.data });
  if (error) return dbFail("activate-survey", error);
  revalidatePath("/admin/content", "layout");
  return ok(undefined);
}

export async function saveSurveyQuestion(input: unknown): Promise<ActionResult> {
  const parsed = surveyQuestionSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput", toFieldErrors(parsed.error));
  const supabase = await admin();
  const { id, surveyId, type, prompt, options, required } = parsed.data;
  const fields = {
    type,
    prompt,
    options: ["single_choice", "multi_choice", "scale"].includes(type) ? options : [],
    required,
  };

  if (id) {
    const { error } = await supabase.from("survey_questions").update(fields).eq("id", id);
    if (error) return dbFail("update-survey-question", error);
  } else {
    const { data: last } = await supabase
      .from("survey_questions")
      .select("position")
      .eq("survey_id", surveyId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await supabase
      .from("survey_questions")
      .insert({ ...fields, survey_id: surveyId, position: (last?.position ?? -1) + 1 });
    if (error) return dbFail("create-survey-question", error);
  }
  revalidatePath(`/admin/content/surveys/${surveyId}`);
  return ok(undefined);
}

export async function deleteSurveyQuestion(questionId: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(questionId);
  if (!id.success) return fail("invalidInput");
  const supabase = await admin();
  const { error } = await supabase.from("survey_questions").delete().eq("id", id.data);
  // 23503: already answered by someone; keep history, publish a new survey instead.
  if (error?.code === "23503") return fail("inUse");
  if (error) return dbFail("delete-survey-question", error);
  revalidatePath("/admin/content", "layout");
  return ok(undefined);
}

// ---------------------------------------------------------------- tests
export async function createTest(input: unknown): Promise<ActionResult> {
  const parsed = testSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput", toFieldErrors(parsed.error));
  const supabase = await admin();
  const { data, error } = await supabase
    .from("tests")
    .insert({
      title: parsed.data.title,
      time_limit_seconds: parsed.data.timeLimitMinutes ? parsed.data.timeLimitMinutes * 60 : null,
      pass_score: 0, // nothing is scored any more
    })
    .select("id")
    .single();
  if (error) return dbFail("create-test", error);
  redirect(`/admin/content/tests/${data.id}`);
}

export async function updateTest(testId: unknown, input: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(testId);
  const parsed = testSchema.safeParse(input);
  if (!id.success || !parsed.success) return fail("invalidInput");
  const supabase = await admin();
  const { error } = await supabase
    .from("tests")
    .update({
      title: parsed.data.title,
      time_limit_seconds: parsed.data.timeLimitMinutes ? parsed.data.timeLimitMinutes * 60 : null,
    })
    .eq("id", id.data);
  if (error) return dbFail("update-test", error);
  revalidatePath(`/admin/content/tests/${id.data}`);
  return ok(undefined);
}

export async function activateTest(testId: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(testId);
  if (!id.success) return fail("invalidInput");
  const supabase = await admin();
  const { error } = await supabase.rpc("admin_activate_test", { p_test_id: id.data });
  if (error) return dbFail("activate-test", error);
  revalidatePath("/admin/content", "layout");
  return ok(undefined);
}

export async function saveTestQuestion(input: unknown): Promise<ActionResult> {
  const parsed = testQuestionSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput", toFieldErrors(parsed.error));
  const supabase = await admin();
  const { id, testId, type, prompt, options } = parsed.data;
  const fields = { type, prompt, options };

  if (id) {
    const { error } = await supabase.from("test_questions").update(fields).eq("id", id);
    if (error) return dbFail("update-test-question", error);
  } else {
    const { data: last } = await supabase
      .from("test_questions")
      .select("position")
      .eq("test_id", testId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await supabase
      .from("test_questions")
      .insert({ test_id: testId, ...fields, position: (last?.position ?? -1) + 1 });
    if (error) return dbFail("create-test-question", error);
  }
  revalidatePath(`/admin/content/tests/${testId}`);
  return ok(undefined);
}

export async function deleteTestQuestion(questionId: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(questionId);
  if (!id.success) return fail("invalidInput");
  const supabase = await admin();
  const { error } = await supabase.from("test_questions").delete().eq("id", id.data);
  if (error) return dbFail("delete-test-question", error);
  revalidatePath("/admin/content", "layout");
  return ok(undefined);
}

export async function swapQuestions(input: unknown): Promise<ActionResult> {
  const parsed = swapSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput");
  const supabase = await admin();
  const fn = {
    survey: "admin_swap_survey_questions",
    test: "admin_swap_test_questions",
    video: "admin_swap_video_questions",
  } as const;
  const { error } = await supabase.rpc(fn[parsed.data.kind], {
    p_a: parsed.data.a,
    p_b: parsed.data.b,
  });
  if (error) return dbFail("swap-questions", error);
  revalidatePath("/admin/content", "layout");
  return ok(undefined);
}

// ---------------------------------------------------------------- video prompts
export async function savePrompt(input: unknown): Promise<ActionResult> {
  const parsed = promptSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput", toFieldErrors(parsed.error));
  const profile = await requireAdminMfa();
  const supabase = await createClient();
  const { id, setId, prompt, maxSeconds, isActive } = parsed.data;
  const fields = { prompt, max_seconds: maxSeconds, is_active: isActive };
  if (id) {
    const { error } = await supabase
      .from("video_questions")
      .update(fields)
      .eq("id", id)
      .eq("set_id", setId);
    if (error) return dbFail("update-prompt", error);
  } else {
    const { data: last } = await supabase
      .from("video_questions")
      .select("position")
      .eq("set_id", setId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await supabase.from("video_questions").insert({
      ...fields,
      set_id: setId,
      position: (last?.position ?? -1) + 1,
      created_by: profile.id,
    });
    if (error) return dbFail("create-prompt", error);
  }
  revalidatePath(`/admin/content/videos/${setId}`);
  return ok(undefined);
}

// ---------------------------------------------------------------- video question sets
export async function createVideoSet(input: unknown): Promise<ActionResult> {
  const parsed = videoSetSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput", toFieldErrors(parsed.error));
  const supabase = await admin();
  const { data, error } = await supabase
    .from("video_question_sets")
    .insert({ title: parsed.data.title })
    .select("id")
    .single();
  if (error) return dbFail("create-video-set", error);
  redirect(`/admin/content/videos/${data.id}`);
}

export async function renameVideoSet(setId: unknown, input: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(setId);
  const parsed = videoSetSchema.safeParse(input);
  if (!id.success || !parsed.success) return fail("invalidInput");
  const supabase = await admin();
  const { error } = await supabase
    .from("video_question_sets")
    .update({ title: parsed.data.title })
    .eq("id", id.data);
  if (error) return dbFail("rename-video-set", error);
  revalidatePath("/admin/content", "layout");
  return ok(undefined);
}

export async function activateVideoSet(setId: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(setId);
  if (!id.success) return fail("invalidInput");
  const supabase = await admin();
  const { error } = await supabase.rpc("admin_activate_video_set", { p_set_id: id.data });
  if (error) return dbFail("activate-video-set", error);
  revalidatePath("/admin/content", "layout");
  return ok(undefined);
}
