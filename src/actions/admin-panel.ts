"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminMfa } from "@/lib/auth/session";
import { dbFail } from "@/lib/db-errors";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import { toFieldErrors } from "@/lib/validations/auth";
import {
  adminJobStatusSchema,
  promptSchema,
  surveyQuestionSchema,
  surveySchema,
  swapSchema,
  testQuestionSchema,
  testSchema,
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
      time_limit_seconds: parsed.data.timeLimitMinutes * 60,
      pass_score: parsed.data.passScore,
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
      time_limit_seconds: parsed.data.timeLimitMinutes * 60,
      pass_score: parsed.data.passScore,
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
  const { id, testId, prompt, options, correctOption } = parsed.data;
  let questionId = id;

  if (id) {
    const { error } = await supabase
      .from("test_questions")
      .update({ prompt, options })
      .eq("id", id);
    if (error) return dbFail("update-test-question", error);
  } else {
    const { data: last } = await supabase
      .from("test_questions")
      .select("position")
      .eq("test_id", testId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data, error } = await supabase
      .from("test_questions")
      .insert({ test_id: testId, prompt, options, position: (last?.position ?? -1) + 1 })
      .select("id")
      .single();
    if (error) return dbFail("create-test-question", error);
    questionId = data.id;
  }
  // Answer keys live in a table no client can read; only this RPC writes them.
  const { error: keyError } = await supabase.rpc("admin_set_answer_key", {
    p_question_id: questionId!,
    p_correct_option: correctOption,
  });
  if (keyError) return dbFail("set-answer-key", keyError);
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
  const fn =
    parsed.data.kind === "survey" ? "admin_swap_survey_questions" : "admin_swap_test_questions";
  const { error } = await supabase.rpc(fn, { p_a: parsed.data.a, p_b: parsed.data.b });
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
  const { id, prompt, maxSeconds, isActive } = parsed.data;
  const fields = { prompt, max_seconds: maxSeconds, is_active: isActive };
  if (id) {
    const { error } = await supabase.from("video_prompts").update(fields).eq("id", id);
    if (error) return dbFail("update-prompt", error);
  } else {
    const { data: last } = await supabase
      .from("video_prompts")
      .select("position")
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await supabase
      .from("video_prompts")
      .insert({ ...fields, position: (last?.position ?? -1) + 1, created_by: profile.id });
    if (error) return dbFail("create-prompt", error);
  }
  revalidatePath("/admin/content/prompts");
  return ok(undefined);
}
