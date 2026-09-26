import "server-only";
import { randomUUID } from "node:crypto";
import { dbFail } from "@/lib/db-errors";
import { notifyAdmins } from "@/lib/email/notify";
import { serverEnv } from "@/lib/env.server";
import { logError } from "@/lib/log";
import { fail, ok, type ActionResult } from "@/lib/result";
import { detectFileKind } from "@/lib/security/file-signature";
import { basicProfileSchema, fullProfileSchema } from "@/lib/validations/apply";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";
import { getSmsProvider, hashCode, newCode, OTP_MAX_ATTEMPTS, OTP_TTL_MINUTES } from "./otp";
import { clearToken, issueToken, readTokenHash } from "./token";

// The only code that writes public applications. It uses the service role
// (no client role can write these tables), so every function first resolves
// the caller's application from (job id, cookie token hash). Nothing here
// returns answer keys, scores or other applicants' data.

export const VIDEO_BUCKET = "application-videos";
export const CV_BUCKET = "application-cvs";
const MAX_CV_BYTES = 5 * 1024 * 1024;
export const CONSENT_VERSION = "2026-10-v2";
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
// One video answers all the questions; the database allows up to 5 minutes.
export const VIDEO_MAX_SECONDS = 300;

const db = () => createAdminClient();

export type TestQuestionView = {
  id: string;
  type: "single_choice" | "multi_choice" | "short_text" | "long_text" | "typing";
  prompt: string;
  // For "typing": one item, the paragraph to type.
  options: string[];
  timeLimitSeconds: number | null;
};
export type Profile = Record<string, string | number>;
export type SurveyQuestionView = {
  id: string;
  type: "single_choice" | "multi_choice" | "short_text" | "long_text" | "number" | "scale";
  prompt: string;
  options: string[];
  required: boolean;
};
export type ApplyView =
  | { stage: "start" }
  | {
      stage: "test";
      steps: Steps;
      startedAt: string | null;
      deadline: string | null;
      timeLimitSeconds: number | null;
      questions: TestQuestionView[];
      answers: Record<string, Json>;
    }
  | {
      stage: "video";
      steps: Steps;
      // "questions": one video per video question. "one": one video about the
      // test's questions (when the job has no video questions).
      mode: "questions" | "one";
      questions: { id: string; prompt: string; maxSeconds: number; recorded: boolean }[];
      prompts: string[];
      maxSeconds: number;
      recorded: boolean;
      fullProfile: boolean;
      profile: Profile | null;
      hasCv: boolean;
      requireOtp: boolean;
      deadline: string | null;
    }
  | {
      stage: "survey";
      steps: Steps;
      questions: SurveyQuestionView[];
      deadline: string | null;
    };
export type Steps = { test: boolean; video: boolean };

type AppRow = {
  id: string;
  current_step: "test" | "video" | "survey" | "submitted";
  test_id: string | null;
  video_set_id: string | null;
  survey_id: string | null;
  test_started_at: string | null;
  task_started_at: string | null;
  survey_started_at: string | null;
  profile: Json | null;
  cv_path: string | null;
  jobs: { full_profile: boolean } | null;
};

const deadlineFrom = (start: string | null, seconds: number | null | undefined) =>
  start && seconds ? new Date(new Date(start).getTime() + seconds * 1000).toISOString() : null;

async function currentApplication(
  jobId: string,
): Promise<{ app: AppRow; tokenHash: string } | null> {
  const tokenHash = await readTokenHash(jobId);
  if (!tokenHash) return null;
  const { data } = await db()
    .from("applications")
    .select(
      "id, current_step, test_id, video_set_id, survey_id, test_started_at, task_started_at, survey_started_at, profile, cv_path, jobs(full_profile)",
    )
    .eq("job_id", jobId)
    .eq("draft_token_hash", tokenHash)
    .eq("status", "in_progress")
    .gt("draft_expires_at", new Date().toISOString())
    .maybeSingle();
  return data ? { app: data, tokenHash } : null;
}

async function stepsFor(app: AppRow): Promise<Steps> {
  const [tests, videos] = await Promise.all([
    app.test_id
      ? db()
          .from("test_questions")
          .select("id", { count: "exact", head: true })
          .eq("test_id", app.test_id)
      : null,
    app.video_set_id
      ? db()
          .from("video_questions")
          .select("id", { count: "exact", head: true })
          .eq("set_id", app.video_set_id)
          .eq("is_active", true)
      : null,
  ]);
  void videos;
  // Every application has the Task step: it holds the contact details.
  return { test: (tests?.count ?? 0) > 0, video: true };
}

const asOptions = (value: Json) =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

// What the apply page shows for this visitor and job.
export async function getApplyView(jobId: string): Promise<ApplyView> {
  const current = await currentApplication(jobId);
  if (!current) return { stage: "start" };
  const { app } = current;
  const steps = await stepsFor(app);

  if (app.current_step === "test") {
    const [{ data: test }, { data: questions }, { data: answers }] = await Promise.all([
      db().from("tests").select("time_limit_seconds").eq("id", app.test_id!).maybeSingle(),
      // Never select answer keys: the applicant only gets prompts and options.
      db()
        .from("test_questions")
        .select("id, type, prompt, options, time_limit_seconds")
        .eq("test_id", app.test_id!)
        .order("position"),
      db()
        .from("application_test_answers")
        .select("question_id, answer")
        .eq("application_id", app.id),
    ]);
    const limit = test?.time_limit_seconds ?? null;
    return {
      stage: "test",
      steps,
      startedAt: app.test_started_at,
      timeLimitSeconds: limit,
      deadline:
        app.test_started_at && limit
          ? new Date(new Date(app.test_started_at).getTime() + limit * 1000).toISOString()
          : null,
      questions: (questions ?? []).map((q) => ({
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        options: asOptions(q.options),
        timeLimitSeconds: q.time_limit_seconds,
      })),
      answers: Object.fromEntries((answers ?? []).map((a) => [a.question_id, a.answer])),
    };
  }

  if (app.current_step === "video") {
    // One video per video question; without video questions, one video about
    // the test's questions.
    const [{ data: set }, { data: testQs }, { data: videoQs }, { data: videos }] =
      await Promise.all([
        app.video_set_id
          ? db()
              .from("video_question_sets")
              .select("time_limit_seconds")
              .eq("id", app.video_set_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        app.test_id
          ? db()
              .from("test_questions")
              .select("prompt")
              .eq("test_id", app.test_id)
              .order("position")
          : Promise.resolve({ data: [] as { prompt: string }[] }),
        app.video_set_id
          ? db()
              .from("video_questions")
              .select("id, prompt, max_seconds")
              .eq("set_id", app.video_set_id)
              .eq("is_active", true)
              .order("position")
          : Promise.resolve({ data: [] as { id: string; prompt: string; max_seconds: number }[] }),
        db().from("application_videos").select("id, question_id").eq("application_id", app.id),
      ]);
    const done = new Set((videos ?? []).map((v) => v.question_id));
    const perQuestion = (videoQs ?? []).length > 0;
    const profile =
      app.profile && typeof app.profile === "object" && !Array.isArray(app.profile)
        ? (app.profile as Profile)
        : null;
    return {
      stage: "video",
      steps,
      mode: perQuestion ? "questions" : "one",
      questions: (videoQs ?? []).map((q) => ({
        id: q.id,
        prompt: q.prompt,
        maxSeconds: q.max_seconds,
        recorded: done.has(q.id),
      })),
      prompts: perQuestion ? [] : (testQs ?? []).map((q) => q.prompt),
      maxSeconds: VIDEO_MAX_SECONDS,
      recorded: !perQuestion && Boolean(videos?.length),
      fullProfile: Boolean(app.jobs?.full_profile),
      profile,
      hasCv: Boolean(app.cv_path),
      requireOtp: serverEnv.REQUIRE_PHONE_OTP,
      deadline: deadlineFrom(app.task_started_at, set?.time_limit_seconds),
    };
  }

  const [{ data: questions }, { data: survey }] = await Promise.all([
    app.survey_id
      ? db()
          .from("survey_questions")
          .select("id, type, prompt, options, required")
          .eq("survey_id", app.survey_id)
          .order("position")
      : Promise.resolve({ data: [] }),
    app.survey_id
      ? db().from("surveys").select("time_limit_seconds").eq("id", app.survey_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return {
    stage: "survey",
    steps,
    deadline: deadlineFrom(app.survey_started_at, survey?.time_limit_seconds),
    questions: (questions ?? []).map((q) => ({ ...q, options: asOptions(q.options) })),
  };
}

// ------------------------------------------------------------------ start
// Starts a new application (or keeps the current one) and sets the cookie.
// Turnstile and the IP rate limit are checked by the caller.
export async function startApplication(jobId: string, ipHash: string): Promise<ActionResult> {
  if (await currentApplication(jobId)) return ok(undefined);
  const tokenHash = await issueToken(jobId);
  const { error } = await db().rpc("app_start", {
    p_job_id: jobId,
    p_token_hash: tokenHash,
    p_ip_hash: ipHash,
  });
  if (error) {
    await clearToken(jobId);
    return dbFail("app-start", error);
  }
  return ok(undefined);
}

// Runs one app_* step function with the caller's token.
async function withToken(
  jobId: string,
  run: (
    tokenHash: string,
  ) => PromiseLike<{ error: import("@supabase/supabase-js").PostgrestError | null }>,
  context: string,
): Promise<ActionResult> {
  const tokenHash = await readTokenHash(jobId);
  if (!tokenHash) return fail("sessionExpired");
  const { error } = await run(tokenHash);
  return error ? dbFail(context, error) : ok(undefined);
}

// ------------------------------------------------------------------ test
export const startTest = (jobId: string) =>
  withToken(
    jobId,
    (t) => db().rpc("app_start_test", { p_job_id: jobId, p_token_hash: t }),
    "app-start-test",
  );

export const saveTestAnswer = (jobId: string, questionId: string, answer: Json) =>
  withToken(
    jobId,
    (t) =>
      db().rpc("app_save_test_answer", {
        p_job_id: jobId,
        p_token_hash: t,
        p_question_id: questionId,
        p_answer: answer,
      }),
    "app-test-answer",
  );

export const submitTest = (jobId: string) =>
  withToken(
    jobId,
    (t) => db().rpc("app_submit_test", { p_job_id: jobId, p_token_hash: t }),
    "app-submit-test",
  );

// ------------------------------------------------------------------ video
// A one-time upload URL for one answer. The path is chosen here, never by the client.
export async function createVideoUpload(
  jobId: string,
  mime: "video/webm" | "video/mp4" | "video/quicktime",
  questionId?: string,
): Promise<ActionResult<{ path: string; signedUrl: string; token: string }>> {
  const current = await currentApplication(jobId);
  if (!current) return fail("sessionExpired");
  if (current.app.current_step !== "video") return fail("wrongStep");
  const ext = { "video/webm": "webm", "video/mp4": "mp4", "video/quicktime": "mov" }[mime];
  // One folder per question ("answer": the one video about the test).
  const path = `${current.app.id}/${questionId ?? "answer"}/${randomUUID()}.${ext}`;
  const { data, error } = await db().storage.from(VIDEO_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    logError("app-video-upload-url", error);
    return fail("generic");
  }
  return ok({ path, signedUrl: data.signedUrl, token: data.token });
}

// Checks the uploaded file (size, type from the storage metadata and its first
// bytes) and records it as the application's one video. Invalid files are deleted.
export async function confirmVideo(
  jobId: string,
  path: string,
  durationSeconds: number,
): Promise<ActionResult> {
  const current = await currentApplication(jobId);
  if (!current) return fail("sessionExpired");
  const parts = path.split("/");
  const questionId = parts[1] === "answer" ? null : parts[1];
  if (
    parts.length !== 3 ||
    parts[0] !== current.app.id ||
    path.includes("..") ||
    (questionId !== null && !/^[0-9a-f-]{36}$/.test(questionId))
  ) {
    return fail("invalidFile");
  }
  const storage = db().storage.from(VIDEO_BUCKET);
  const folder = path.slice(0, path.lastIndexOf("/"));
  const name = path.slice(path.lastIndexOf("/") + 1);
  const { data: listing } = await storage.list(folder, { search: name, limit: 1 });
  const object = listing?.find((o) => o.name === name);
  const size = Number(object?.metadata?.size ?? 0);
  const mime = String(object?.metadata?.mimetype ?? "");

  let kind: string | null = null;
  if (object) {
    const { data: signed } = await storage.createSignedUrl(path, 60);
    if (signed) {
      const res = await fetch(signed.signedUrl, { headers: { range: "bytes=0-15" } });
      kind = res.ok ? detectFileKind(new Uint8Array(await res.arrayBuffer())) : null;
    }
  }
  // MP4 and iPhone .mov files share the same container signature ("ftyp").
  const expected =
    mime === "video/mp4" || mime === "video/quicktime"
      ? "mp4"
      : mime === "video/webm"
        ? "webm"
        : null;
  if (!object || size < 1 || size > MAX_VIDEO_BYTES || !expected || kind !== expected) {
    if (object) await storage.remove([path]);
    return fail("invalidFile");
  }

  const seconds = Math.min(VIDEO_MAX_SECONDS, Math.max(1, Math.round(durationSeconds)));
  const { data: replaced, error } = questionId
    ? await db()
        .rpc("app_record_question_video", {
          p_job_id: jobId,
          p_token_hash: current.tokenHash,
          p_question_id: questionId,
          p_storage_path: path,
          p_duration_seconds: seconds,
          p_size_bytes: size,
          p_mime_type: mime,
        })
        .then((r) => ({ data: r.data ? [r.data] : [], error: r.error }))
    : await db().rpc("app_record_video", {
        p_job_id: jobId,
        p_token_hash: current.tokenHash,
        p_storage_path: path,
        p_duration_seconds: seconds,
        p_size_bytes: size,
        p_mime_type: mime,
      });
  if (error) {
    await storage.remove([path]);
    return dbFail("app-record-video", error);
  }
  // A new recording replaces the earlier one: delete the old file(s).
  const old = (replaced ?? []).filter((p) => p !== path);
  if (old.length) await storage.remove(old);
  return ok(undefined);
}

export const finishVideos = (jobId: string) =>
  withToken(
    jobId,
    (t) => db().rpc("app_finish_videos", { p_job_id: jobId, p_token_hash: t }),
    "app-finish-videos",
  );

// ------------------------------------------------------------------ Task profile + CV
// Checks every field (the full profile when the job asks for it) and saves it.
export async function saveProfile(
  jobId: string,
  input: Record<string, string | number>,
): Promise<ActionResult<{ fieldErrors?: Record<string, string> }>> {
  const current = await currentApplication(jobId);
  if (!current) return fail("sessionExpired");
  const schema = current.app.jobs?.full_profile ? fullProfileSchema : basicProfileSchema;
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return fail("invalidInput", fieldErrors);
  }
  const { error } = await db().rpc("app_save_profile", {
    p_job_id: jobId,
    p_token_hash: current.tokenHash,
    p_profile: parsed.data,
  });
  return error ? dbFail("app-save-profile", error) : ok({});
}

export async function createCvUpload(
  jobId: string,
  kind: "pdf" | "docx",
): Promise<ActionResult<{ path: string; signedUrl: string; token: string }>> {
  const current = await currentApplication(jobId);
  if (!current) return fail("sessionExpired");
  if (current.app.current_step !== "video") return fail("wrongStep");
  const path = `${current.app.id}/cv/${randomUUID()}.${kind}`;
  const { data, error } = await db().storage.from(CV_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    logError("app-cv-upload-url", error);
    return fail("generic");
  }
  return ok({ path, signedUrl: data.signedUrl, token: data.token });
}

// Checks the uploaded CV (size, PDF or Word from its first bytes) and records it.
export async function confirmCv(jobId: string, path: string): Promise<ActionResult> {
  const current = await currentApplication(jobId);
  if (!current) return fail("sessionExpired");
  const parts = path.split("/");
  if (
    parts.length !== 3 ||
    parts[0] !== current.app.id ||
    parts[1] !== "cv" ||
    path.includes("..")
  ) {
    return fail("invalidFile");
  }
  const storage = db().storage.from(CV_BUCKET);
  const { data: listing } = await storage.list(`${current.app.id}/cv`, {
    search: parts[2],
    limit: 1,
  });
  const object = listing?.find((o) => o.name === parts[2]);
  const size = Number(object?.metadata?.size ?? 0);
  const expected = parts[2].endsWith(".pdf") ? "pdf" : "zip"; // DOCX is a ZIP container
  const mime =
    expected === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  let kind: string | null = null;
  if (object && size >= 1 && size <= MAX_CV_BYTES) {
    const { data: signed } = await storage.createSignedUrl(path, 60);
    if (signed) {
      // A PDF is known from its first bytes. A DOCX must also be a real Word
      // file, not just any ZIP: it names its main document inside.
      const res = await fetch(
        signed.signedUrl,
        expected === "pdf" ? { headers: { range: "bytes=0-15" } } : undefined,
      );
      const bytes = res.ok ? new Uint8Array(await res.arrayBuffer()) : null;
      kind = bytes ? detectFileKind(bytes.subarray(0, 16)) : null;
      if (kind === "zip" && !(bytes && isWordDocument(bytes))) kind = null;
    }
  }
  if (
    !object ||
    size < 1 ||
    size > MAX_CV_BYTES ||
    kind !== expected ||
    (object.metadata?.mimetype && object.metadata.mimetype !== mime)
  ) {
    if (object) await storage.remove([path]);
    return fail("invalidFile");
  }
  const { data: old, error } = await db().rpc("app_record_cv", {
    p_job_id: jobId,
    p_token_hash: current.tokenHash,
    p_storage_path: path,
  });
  if (error) {
    await storage.remove([path]);
    return dbFail("app-record-cv", error);
  }
  if (old && old !== path) await storage.remove([old]);
  return ok(undefined);
}

// ------------------------------------------------------------------ phone code (optional)
export async function sendPhoneCode(jobId: string, phoneE164: string): Promise<ActionResult> {
  const current = await currentApplication(jobId);
  if (!current) return fail("sessionExpired");
  const provider = getSmsProvider();
  if (!provider) {
    logError("app-otp", { name: "NoSmsProvider" });
    return fail("generic");
  }
  const code = newCode();
  const { error } = await db()
    .from("phone_verifications")
    .insert({
      application_id: current.app.id,
      phone_e164: phoneE164,
      code_hash: hashCode(current.app.id, code),
      expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString(),
    });
  if (error) return dbFail("app-otp-insert", error);
  await provider.send(phoneE164, `Your Wemuste code is ${code}`);
  return ok(undefined);
}

// A DOCX (a ZIP) lists "word/document.xml" and "[Content_Types].xml" by name.
function isWordDocument(bytes: Uint8Array) {
  const text = new TextDecoder("latin1").decode(bytes);
  return text.includes("word/document.xml") && text.includes("[Content_Types].xml");
}

export async function verifyPhoneCode(jobId: string, code: string): Promise<ActionResult> {
  const current = await currentApplication(jobId);
  if (!current) return fail("sessionExpired");
  const { data: row } = await db()
    .from("phone_verifications")
    .select("id, code_hash, attempts, expires_at")
    .eq("application_id", current.app.id)
    .is("verified_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row || row.attempts >= OTP_MAX_ATTEMPTS || new Date(row.expires_at) < new Date()) {
    return fail("invalidCode");
  }
  // Count the try first, and only if nobody else counted one meanwhile: tries
  // sent at the same time can't get past the limit.
  const { data: counted } = await db()
    .from("phone_verifications")
    .update({ attempts: row.attempts + 1 })
    .eq("id", row.id)
    .eq("attempts", row.attempts)
    .select("id");
  if (!counted?.length) return fail("invalidCode");
  if (row.code_hash !== hashCode(current.app.id, code)) return fail("invalidCode");
  await db()
    .from("phone_verifications")
    .update({ verified_at: new Date().toISOString() })
    .eq("id", row.id);
  return ok(undefined);
}

async function phoneVerified(applicationId: string, phoneE164: string) {
  if (!serverEnv.REQUIRE_PHONE_OTP) return true;
  const { data } = await db()
    .from("phone_verifications")
    .select("id")
    .eq("application_id", applicationId)
    .eq("phone_e164", phoneE164)
    .not("verified_at", "is", null)
    .limit(1);
  return Boolean(data?.length);
}

// ------------------------------------------------------------------ submit
// The contact details come from the Task step's saved profile.
export async function submitApplication(
  jobId: string,
  answers: Record<string, Json>,
  ipHash: string,
): Promise<ActionResult> {
  const current = await currentApplication(jobId);
  if (!current) return fail("sessionExpired");
  const profile = (current.app.profile ?? {}) as Profile;
  const phone = String(profile.phone ?? "");
  const { error } = await db().rpc("app_submit", {
    p_job_id: jobId,
    p_token_hash: current.tokenHash,
    p_full_name: String(profile.fullName ?? ""),
    p_phone_e164: phone,
    p_email: String(profile.email ?? ""),
    p_answers: answers,
    p_consent_version: CONSENT_VERSION,
    p_ip_hash: ipHash,
    p_phone_verified: await phoneVerified(current.app.id, phone),
  });
  if (error) return dbFail("app-submit", error);
  await clearToken(jobId);

  // Tell the team, without any personal data in the email.
  notifyAdmins("newApplication");
  return ok(undefined);
}

// ------------------------------------------------------------------ cleanup
// Deletes unfinished applications older than 48 h and every file under them.
export async function cleanupAbandoned(hours = 48) {
  const { data, error } = await db().rpc("app_cleanup_candidates", { p_hours: hours });
  if (error) throw error;
  const ids = [...new Set((data ?? []).map((r) => r.application_id))];
  const storage = db().storage.from(VIDEO_BUCKET);
  let files = 0;
  for (const id of ids) {
    // Includes uploads that were never confirmed.
    const { data: folders } = await storage.list(id, { limit: 100 });
    for (const folder of folders ?? []) {
      const { data: objects } = await storage.list(`${id}/${folder.name}`, { limit: 100 });
      const paths = (objects ?? []).map((o) => `${id}/${folder.name}/${o.name}`);
      if (paths.length) {
        const { error: removeError } = await storage.remove(paths);
        if (removeError) throw removeError;
        files += paths.length;
      }
    }
  }
  // Their CVs too.
  const cvs = db().storage.from(CV_BUCKET);
  for (const id of ids) {
    const { data: objects } = await cvs.list(`${id}/cv`, { limit: 100 });
    const paths = (objects ?? []).map((o) => `${id}/cv/${o.name}`);
    if (paths.length) {
      const { error: removeError } = await cvs.remove(paths);
      if (removeError) throw removeError;
      files += paths.length;
    }
  }
  if (!ids.length) return { applications: 0, files };
  const { data: deleted, error: deleteError } = await db().rpc("app_cleanup", {
    p_application_ids: ids,
  });
  if (deleteError) throw deleteError;
  return { applications: deleted ?? 0, files };
}

// Title and place of the job being applied to. Only live jobs, unless the
// visitor already has an application for it (so a closed job can be finished).
export async function getJobSummary(
  jobId: string,
  hasApplication: boolean,
): Promise<{ title: string; locationLabel: string } | null> {
  const { data } = await db()
    .from("jobs")
    .select("title, location_label, status, employer_profiles!inner(status)")
    .eq("id", jobId)
    .maybeSingle();
  if (!data) return null;
  const live = data.status === "published" && data.employer_profiles.status === "approved";
  if (!live && !hasApplication) return null;
  return { title: data.title, locationLabel: data.location_label };
}
