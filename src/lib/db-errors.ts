import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import { logError } from "@/lib/log";
import { fail, type ActionError, type ActionResult } from "@/lib/result";

// Our SECURITY DEFINER functions raise short, stable codes as the message.
const KNOWN: Record<string, ActionError> = {
  not_found: "notFound",
  forbidden: "forbidden",
  profile_incomplete: "profileIncomplete",
  already_requested: "alreadyRequested",
  too_many_pending: "tooManyPending",
  time_expired: "timeExpired",
  incomplete: "incomplete",
  already_submitted: "incomplete",
  invalid_answer: "invalidInput",
  employer_not_approved: "invalidInput",
  employee_not_approved: "invalidInput",
  invalid_expiry: "invalidInput",
  invalid_option: "invalidInput",
  invalid_slot: "invalidInput",
  invalid_transition: "invalidInput",
  invalid_token: "sessionExpired",
  job_unavailable: "jobUnavailable",
  wrong_step: "wrongStep",
  invalid_video: "invalidFile",
  phone_unverified: "phoneUnverified",
};

export function dbFail(context: string, error: PostgrestError): ActionResult<never> {
  const known = KNOWN[error.message];
  if (known) return fail(known);
  if (error.code === "42501") return fail("forbidden");
  logError(context, error);
  return fail("generic");
}
