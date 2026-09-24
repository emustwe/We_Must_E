"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { dbFail } from "@/lib/db-errors";
import { CONSENT_VERSIONS } from "@/lib/legal";
import { logError } from "@/lib/log";
import { CV_MAX_BYTES, CV_MIME_TYPES } from "@/lib/onboarding/constants";
import { fail, ok, type ActionResult } from "@/lib/result";
import { detectFileKind } from "@/lib/security/file-signature";
import { getIpHash } from "@/lib/security/ip";
import { withinRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { toFieldErrors } from "@/lib/validations/auth";
import { idSchema } from "@/lib/validations/jobs";
import {
  basicsSchema,
  registerCvSchema,
  registerVideoSchema,
  surveyAnswerSchema,
  testAnswerSchema,
} from "@/lib/validations/onboarding";

type Supabase = Awaited<ReturnType<typeof createClient>>;

function done(path = "/employee/onboarding") {
  revalidatePath(path, "layout");
}

// ---------------------------------------------------------------- basics
export async function saveBasics(input: unknown): Promise<ActionResult> {
  const parsed = basicsSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput", toFieldErrors(parsed.error));
  const profile = await requireRole("employee");
  const v = parsed.data;

  const supabase = await createClient();
  const [a, b] = await Promise.all([
    supabase
      .from("employee_profiles")
      .update({
        headline: v.headline,
        city_emirate: v.cityEmirate,
        languages: v.languages,
        skills: v.skills,
        availability: v.availability,
        expected_pay_range: v.expectedPayRange || null,
      })
      .eq("user_id", profile.id),
    supabase
      .from("employee_contacts")
      .update({ phone: v.phone, whatsapp: v.whatsapp || null })
      .eq("user_id", profile.id),
  ]);
  if (a.error) return dbFail("save-basics", a.error);
  if (b.error) return dbFail("save-contacts", b.error);
  done();
  return ok(undefined);
}

// ---------------------------------------------------------------- survey
export async function startSurvey(): Promise<ActionResult> {
  const profile = await requireRole("employee");
  const supabase = await createClient();
  const { data: survey } = await supabase
    .from("surveys")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();
  if (!survey) return fail("notFound");
  const { error } = await supabase
    .from("survey_responses")
    .insert({ employee_id: profile.id, survey_id: survey.id });
  // 23505: already started; resuming is fine.
  if (error && error.code !== "23505") return dbFail("start-survey", error);
  done();
  return ok(undefined);
}

// Validates the answer against the question's type and options.
function checkAnswer(
  question: { type: string; options: unknown; required: boolean },
  answer: string | number | string[],
): boolean {
  const options = Array.isArray(question.options)
    ? (question.options as unknown[]).map(String)
    : [];
  switch (question.type) {
    case "single_choice":
      return typeof answer === "string" && options.includes(answer);
    case "multi_choice":
      return (
        Array.isArray(answer) &&
        answer.every((a) => options.includes(a)) &&
        (!question.required || answer.length > 0)
      );
    case "short_text":
      return (
        typeof answer === "string" &&
        answer.trim().length <= 200 &&
        (!question.required || answer.trim().length > 0)
      );
    case "long_text":
      return (
        typeof answer === "string" &&
        answer.trim().length <= 4000 &&
        (!question.required || answer.trim().length > 0)
      );
    case "number":
      return typeof answer === "number" && Number.isFinite(answer);
    case "scale": {
      const max = options.length || 5;
      return typeof answer === "number" && Number.isInteger(answer) && answer >= 1 && answer <= max;
    }
    default:
      return false;
  }
}

export async function saveSurveyAnswer(input: unknown): Promise<ActionResult> {
  const parsed = surveyAnswerSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput");
  const profile = await requireRole("employee");
  const supabase = await createClient();

  const { data: question } = await supabase
    .from("survey_questions")
    .select("id, survey_id, type, options, required")
    .eq("id", parsed.data.questionId)
    .maybeSingle();
  if (!question) return fail("notFound");
  const answer =
    typeof parsed.data.answer === "string" ? parsed.data.answer.trim() : parsed.data.answer;
  if (!checkAnswer(question, answer)) return fail("invalidInput");

  const { data: response } = await supabase
    .from("survey_responses")
    .select("id, submitted_at")
    .eq("survey_id", question.survey_id)
    .eq("employee_id", profile.id)
    .maybeSingle();
  if (!response || response.submitted_at) return fail("notFound");

  // Insert, or update if already answered (no upsert: PK columns aren't updatable).
  const { error } = await supabase
    .from("survey_answers")
    .insert({ response_id: response.id, question_id: question.id, answer });
  if (error?.code === "23505") {
    const { error: updateError } = await supabase
      .from("survey_answers")
      .update({ answer })
      .eq("response_id", response.id)
      .eq("question_id", question.id);
    if (updateError) return dbFail("update-survey-answer", updateError);
  } else if (error) {
    return dbFail("save-survey-answer", error);
  }
  return ok(undefined);
}

export async function submitSurvey(): Promise<ActionResult> {
  const profile = await requireRole("employee");
  const supabase = await createClient();
  const { data: response } = await supabase
    .from("survey_responses")
    .select("id, surveys!inner(is_active)")
    .eq("employee_id", profile.id)
    .eq("surveys.is_active", true)
    .is("submitted_at", null)
    .maybeSingle();
  if (!response) return fail("notFound");
  const { error } = await supabase.rpc("submit_survey_response", { p_response_id: response.id });
  if (error) return dbFail("submit-survey", error);
  done();
  return ok(undefined);
}

// ---------------------------------------------------------------- test
export async function startTest(): Promise<ActionResult> {
  await requireRole("employee");
  const supabase = await createClient();
  const { data: test } = await supabase
    .from("tests")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();
  if (!test) return fail("notFound");
  const { error } = await supabase.rpc("start_test_attempt", { p_test_id: test.id });
  if (error) return dbFail("start-test", error);
  done();
  return ok(undefined);
}

export async function saveTestAnswer(input: unknown): Promise<ActionResult> {
  const parsed = testAnswerSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput");
  await requireRole("employee");
  const supabase = await createClient();
  // Ownership, the time limit and the option range are enforced by the function.
  const { error } = await supabase.rpc("save_test_answer", {
    p_attempt_id: parsed.data.attemptId,
    p_question_id: parsed.data.questionId,
    p_option: parsed.data.option,
  });
  if (error) return dbFail("save-test-answer", error);
  return ok(undefined);
}

export async function submitTest(attemptId: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(attemptId);
  if (!parsed.success) return fail("invalidInput");
  await requireRole("employee");
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_test_attempt", { p_attempt_id: parsed.data });
  if (error) return dbFail("submit-test", error);
  done();
  return ok(undefined);
}

// ---------------------------------------------------------------- uploads
// Reads the first bytes of an uploaded object with the user's own session
// (storage RLS applies), so the type check never trusts the browser.
async function readHead(supabase: Supabase, bucket: string, path: string) {
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
  if (!data?.signedUrl) return null;
  const res = await fetch(data.signedUrl, { headers: { Range: "bytes=0-63" }, cache: "no-store" });
  if (!res.ok) return null;
  const size = Number(
    res.headers.get("content-range")?.split("/")[1] ?? res.headers.get("content-length"),
  );
  return { bytes: new Uint8Array(await res.arrayBuffer()).slice(0, 64), size };
}

export async function registerVideo(input: unknown): Promise<ActionResult> {
  const parsed = registerVideoSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput");
  const profile = await requireRole("employee");
  const { promptId, path, durationSeconds } = parsed.data;
  if (!path.startsWith(`${profile.id}/`)) return fail("forbidden");
  if (!(await withinRateLimit("uploadPerUser", profile.id))) return fail("rateLimited");

  const supabase = await createClient();
  const head = await readHead(supabase, "video-resumes", path);
  const kind = head ? detectFileKind(head.bytes) : null;
  const expected = path.endsWith(".mp4") ? "mp4" : "webm";
  if (kind !== expected) {
    await supabase.storage.from("video-resumes").remove([path]);
    return fail("invalidFile");
  }

  // Replace any earlier answer to this prompt.
  const { data: previous } = await supabase
    .from("video_resumes")
    .select("id, storage_path")
    .eq("employee_id", profile.id)
    .eq("prompt_id", promptId)
    .maybeSingle();
  if (previous) {
    await supabase.from("video_resumes").delete().eq("id", previous.id);
    await supabase.storage.from("video-resumes").remove([previous.storage_path]);
  }

  const { error } = await supabase.from("video_resumes").insert({
    employee_id: profile.id,
    prompt_id: promptId,
    storage_path: path,
    duration_seconds: durationSeconds,
  });
  if (error) {
    await supabase.storage.from("video-resumes").remove([path]);
    return dbFail("register-video", error);
  }
  done();
  return ok(undefined);
}

export async function deleteVideo(videoId: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(videoId);
  if (!parsed.success) return fail("invalidInput");
  const profile = await requireRole("employee");
  const supabase = await createClient();
  const { data } = await supabase
    .from("video_resumes")
    .delete()
    .eq("id", parsed.data)
    .eq("employee_id", profile.id)
    .select("storage_path")
    .maybeSingle();
  if (!data) return fail("notFound");
  const { error } = await supabase.storage.from("video-resumes").remove([data.storage_path]);
  if (error) logError("delete-video-object", error);
  done();
  return ok(undefined);
}

export async function registerCv(input: unknown): Promise<ActionResult> {
  const parsed = registerCvSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput");
  const profile = await requireRole("employee");
  const { path } = parsed.data;
  if (!path.startsWith(`${profile.id}/`)) return fail("forbidden");
  if (!(await withinRateLimit("uploadPerUser", profile.id))) return fail("rateLimited");

  const supabase = await createClient();
  const head = await readHead(supabase, "cv-documents", path);
  const kind = head ? detectFileKind(head.bytes) : null;
  const isPdf = path.endsWith(".pdf");
  const valid =
    head && head.size > 0 && head.size <= CV_MAX_BYTES && kind === (isPdf ? "pdf" : "zip");
  if (!valid) {
    await supabase.storage.from("cv-documents").remove([path]);
    return fail("invalidFile");
  }

  const { data: previous } = await supabase
    .from("cv_documents")
    .delete()
    .eq("employee_id", profile.id)
    .select("storage_path")
    .maybeSingle();
  if (previous) await supabase.storage.from("cv-documents").remove([previous.storage_path]);

  const { error } = await supabase.from("cv_documents").insert({
    employee_id: profile.id,
    storage_path: path,
    mime_type: isPdf ? CV_MIME_TYPES[0] : CV_MIME_TYPES[1],
    size_bytes: head.size,
  });
  if (error) {
    await supabase.storage.from("cv-documents").remove([path]);
    return dbFail("register-cv", error);
  }
  done();
  return ok(undefined);
}

export async function deleteCv(): Promise<ActionResult> {
  const profile = await requireRole("employee");
  const supabase = await createClient();
  const { data } = await supabase
    .from("cv_documents")
    .delete()
    .eq("employee_id", profile.id)
    .select("storage_path")
    .maybeSingle();
  if (data) await supabase.storage.from("cv-documents").remove([data.storage_path]);
  done();
  return ok(undefined);
}

// ---------------------------------------------------------------- finish
export async function acceptDataSharing(): Promise<ActionResult> {
  const profile = await requireRole("employee");
  const supabase = await createClient();
  const { error } = await supabase.from("consents").insert({
    user_id: profile.id,
    type: "data_sharing",
    version: CONSENT_VERSIONS.data_sharing,
    ip_hash: await getIpHash(),
  });
  if (error) return dbFail("accept-data-sharing", error);
  done();
  return ok(undefined);
}

export async function submitProfile(): Promise<ActionResult> {
  await requireRole("employee");
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_employee_profile");
  if (error) return dbFail("submit-profile", error);
  revalidatePath("/employee", "layout");
  redirect("/employee/onboarding/done?submitted=1");
}
