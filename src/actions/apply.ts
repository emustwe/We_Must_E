"use server";

import { redirect } from "next/navigation";
import { fail, type ActionResult } from "@/lib/result";
import { getIpHash } from "@/lib/security/ip";
import { withinRateLimit } from "@/lib/security/rate-limit";
import { toFieldErrors } from "@/lib/validations/auth";
import {
  jobIdSchema,
  phoneCodeSchema,
  startSchema,
  submitSchema,
  testAnswerSchema,
  testAnswersSchema,
  verifyCodeSchema,
  videoConfirmSchema,
  videoUploadSchema,
} from "@/lib/validations/apply";
import * as app from "@/server/public-application";
import { verifyTurnstile } from "@/server/public-application/turnstile";

// Public application steps. No login: every call is validated here, then the
// server module checks the application cookie before touching the database.

async function stepAllowed() {
  return withinRateLimit("applicationStepPerIp", await getIpHash());
}

export async function startApplication(input: unknown): Promise<ActionResult> {
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput");
  const ipHash = await getIpHash();
  if (!(await withinRateLimit("applicationStartPerIp", ipHash))) return fail("rateLimited");
  if (!(await verifyTurnstile(parsed.data.captchaToken))) return fail("captchaFailed");
  return app.startApplication(parsed.data.jobId, ipHash);
}

export async function startTest(jobId: unknown): Promise<ActionResult> {
  const parsed = jobIdSchema.safeParse(jobId);
  if (!parsed.success) return fail("invalidInput");
  if (!(await stepAllowed())) return fail("rateLimited");
  return app.startTest(parsed.data);
}

export async function saveTestAnswer(input: unknown): Promise<ActionResult> {
  const parsed = testAnswerSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput");
  if (!(await stepAllowed())) return fail("rateLimited");
  const { jobId, questionId, answer } = parsed.data;
  return app.saveTestAnswer(jobId, questionId, answer);
}

// Saves every answer on the test page (skips unchanged ones on the client).
export async function saveTestAnswers(input: unknown): Promise<ActionResult> {
  const parsed = testAnswersSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput");
  if (!(await stepAllowed())) return fail("rateLimited");
  for (const { questionId, answer } of parsed.data.answers) {
    const result = await app.saveTestAnswer(parsed.data.jobId, questionId, answer);
    if (!result.ok) return result;
  }
  return { ok: true, data: undefined };
}

export async function submitTest(jobId: unknown): Promise<ActionResult> {
  const parsed = jobIdSchema.safeParse(jobId);
  if (!parsed.success) return fail("invalidInput");
  if (!(await stepAllowed())) return fail("rateLimited");
  return app.submitTest(parsed.data);
}

export async function createVideoUpload(
  input: unknown,
): Promise<ActionResult<{ path: string; signedUrl: string; token: string }>> {
  const parsed = videoUploadSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput");
  if (!(await withinRateLimit("videoUploadPerIp", await getIpHash()))) return fail("rateLimited");
  const { jobId, mime } = parsed.data;
  return app.createVideoUpload(jobId, mime);
}

export async function confirmVideo(input: unknown): Promise<ActionResult> {
  const parsed = videoConfirmSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput");
  if (!(await stepAllowed())) return fail("rateLimited");
  const { jobId, path, durationSeconds } = parsed.data;
  return app.confirmVideo(jobId, path, durationSeconds);
}

export async function finishVideos(jobId: unknown): Promise<ActionResult> {
  const parsed = jobIdSchema.safeParse(jobId);
  if (!parsed.success) return fail("invalidInput");
  if (!(await stepAllowed())) return fail("rateLimited");
  return app.finishVideos(parsed.data);
}

export async function sendPhoneCode(input: unknown): Promise<ActionResult> {
  const parsed = phoneCodeSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput", toFieldErrors(parsed.error));
  if (!(await withinRateLimit("phoneCodePerIp", await getIpHash()))) return fail("rateLimited");
  return app.sendPhoneCode(parsed.data.jobId, parsed.data.phone);
}

export async function verifyPhoneCode(input: unknown): Promise<ActionResult> {
  const parsed = verifyCodeSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput", toFieldErrors(parsed.error));
  if (!(await stepAllowed())) return fail("rateLimited");
  return app.verifyPhoneCode(parsed.data.jobId, parsed.data.code);
}

export async function submitApplication(input: unknown): Promise<ActionResult> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput", toFieldErrors(parsed.error));
  const ipHash = await getIpHash();
  if (!(await withinRateLimit("applicationStepPerIp", ipHash))) return fail("rateLimited");
  const { jobId, contact, answers } = parsed.data;
  const result = await app.submitApplication(
    jobId,
    {
      fullName: contact.fullName,
      phoneE164: contact.phone,
      email: contact.email || null,
      answers,
    },
    ipHash,
  );
  if (!result.ok) return result;
  redirect(`/apply/${jobId}/submitted`);
}
