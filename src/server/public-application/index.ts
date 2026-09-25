import "server-only";
import { randomUUID } from "node:crypto";
import { dbFail } from "@/lib/db-errors";
import { notifyAdmins } from "@/lib/email/notify";
import { serverEnv } from "@/lib/env.server";
import { logError } from "@/lib/log";
import { fail, ok, type ActionResult } from "@/lib/result";
import { detectFileKind } from "@/lib/security/file-signature";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";
import { getSmsProvider, hashCode, newCode, OTP_MAX_ATTEMPTS, OTP_TTL_MINUTES } from "./otp";
import { clearToken, issueToken, readTokenHash } from "./token";

// The only code that writes public applications. It uses the service role
// (no client role can write these tables), so every function first resolves
// the caller's application from (job id, cookie token hash). Nothing here
// returns answer keys, scores or other applicants' data.

export const VIDEO_BUCKET = "application-videos";
export const CONSENT_VERSION = "2026-10-v2";
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

const db = () => createAdminClient();

export type TestQuestionView = {
  id: string;
  type: "single_choice" | "multi_choice" | "short_text" | "long_text";
  prompt: string;
  options: string[];
};
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
      // All questions are answered in one video, stored against the first.
      questions: { id: string; prompt: string; maxSeconds: number }[];
      answerId: string;
      maxSeconds: number;
      recorded: boolean;
    }
  | { stage: "survey"; steps: Steps; questions: SurveyQuestionView[]; requireOtp: boolean };
export type Steps = { test: boolean; video: boolean };

type AppRow = {
  id: string;
  current_step: "test" | "video" | "survey" | "submitted";
  test_id: string | null;
  video_set_id: string | null;
  survey_id: string | null;
  test_started_at: string | null;
};

async function currentApplication(
  jobId: string,
): Promise<{ app: AppRow; tokenHash: string } | null> {
  const tokenHash = await readTokenHash(jobId);
  if (!tokenHash) return null;
  const { data } = await db()
    .from("applications")
    .select("id, current_step, test_id, video_set_id, survey_id, test_started_at")
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
  return { test: (tests?.count ?? 0) > 0, video: (videos?.count ?? 0) > 0 };
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
        .select("id, type, prompt, options")
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
      questions: (questions ?? []).map((q) => ({ ...q, options: asOptions(q.options) })),
      answers: Object.fromEntries((answers ?? []).map((a) => [a.question_id, a.answer])),
    };
  }

  if (app.current_step === "video") {
    const [{ data: questions }, { data: videos }] = await Promise.all([
      db()
        .from("video_questions")
        .select("id, prompt, max_seconds")
        .eq("set_id", app.video_set_id!)
        .eq("is_active", true)
        // Same order as the database's "first question" (where the video is stored).
        .order("position")
        .order("created_at"),
      db().from("application_videos").select("question_id").eq("application_id", app.id),
    ]);
    const list = (questions ?? []).map((q) => ({
      id: q.id,
      prompt: q.prompt,
      maxSeconds: q.max_seconds,
    }));
    return {
      stage: "video",
      steps,
      questions: list,
      answerId: list[0]?.id ?? "",
      // Same rule as the database: the limits added up, 5 minutes at most.
      maxSeconds: Math.min(
        list.reduce((sum, q) => sum + q.maxSeconds, 0),
        300,
      ),
      recorded: Boolean(videos?.length),
    };
  }

  const { data: questions } = app.survey_id
    ? await db()
        .from("survey_questions")
        .select("id, type, prompt, options, required")
        .eq("survey_id", app.survey_id)
        .order("position")
    : { data: [] };
  return {
    stage: "survey",
    steps,
    requireOtp: serverEnv.REQUIRE_PHONE_OTP,
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
  questionId: string,
  mime: "video/webm" | "video/mp4" | "video/quicktime",
): Promise<ActionResult<{ path: string; signedUrl: string; token: string }>> {
  const current = await currentApplication(jobId);
  if (!current) return fail("sessionExpired");
  if (current.app.current_step !== "video") return fail("wrongStep");
  const { data: question } = await db()
    .from("video_questions")
    .select("id")
    .eq("id", questionId)
    .eq("set_id", current.app.video_set_id!)
    .eq("is_active", true)
    .maybeSingle();
  if (!question) return fail("notFound");

  const ext = { "video/webm": "webm", "video/mp4": "mp4", "video/quicktime": "mov" }[mime];
  const path = `${current.app.id}/${questionId}/${randomUUID()}.${ext}`;
  const { data, error } = await db().storage.from(VIDEO_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    logError("app-video-upload-url", error);
    return fail("generic");
  }
  return ok({ path, signedUrl: data.signedUrl, token: data.token });
}

// Checks the uploaded file (size, type from the storage metadata and its first
// bytes) and records it. Invalid files are deleted.
export async function confirmVideo(
  jobId: string,
  questionId: string,
  path: string,
  durationSeconds: number,
): Promise<ActionResult> {
  const current = await currentApplication(jobId);
  if (!current) return fail("sessionExpired");
  if (!path.startsWith(`${current.app.id}/${questionId}/`) || path.includes("..")) {
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

  const { data: replaced, error } = await db().rpc("app_record_video", {
    p_job_id: jobId,
    p_token_hash: current.tokenHash,
    p_question_id: questionId,
    p_storage_path: path,
    p_duration_seconds: Math.max(1, Math.round(durationSeconds)),
    p_size_bytes: size,
    p_mime_type: mime,
  });
  if (error) {
    await storage.remove([path]);
    return dbFail("app-record-video", error);
  }
  if (replaced && replaced !== path) await storage.remove([replaced]);
  return ok(undefined);
}

export const finishVideos = (jobId: string) =>
  withToken(
    jobId,
    (t) => db().rpc("app_finish_videos", { p_job_id: jobId, p_token_hash: t }),
    "app-finish-videos",
  );

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
  if (row.code_hash !== hashCode(current.app.id, code)) {
    await db()
      .from("phone_verifications")
      .update({ attempts: row.attempts + 1 })
      .eq("id", row.id);
    return fail("invalidCode");
  }
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
export async function submitApplication(
  jobId: string,
  input: {
    fullName: string;
    phoneE164: string;
    email: string | null;
    answers: Record<string, Json>;
  },
  ipHash: string,
): Promise<ActionResult> {
  const current = await currentApplication(jobId);
  if (!current) return fail("sessionExpired");
  const { error } = await db().rpc("app_submit", {
    p_job_id: jobId,
    p_token_hash: current.tokenHash,
    p_full_name: input.fullName,
    p_phone_e164: input.phoneE164,
    p_email: input.email ?? "",
    p_answers: input.answers,
    p_consent_version: CONSENT_VERSION,
    p_ip_hash: ipHash,
    p_phone_verified: await phoneVerified(current.app.id, input.phoneE164),
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
