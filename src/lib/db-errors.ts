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
};

export function dbFail(context: string, error: PostgrestError): ActionResult<never> {
  const known = KNOWN[error.message];
  if (known) return fail(known);
  if (error.code === "42501") return fail("forbidden");
  logError(context, error);
  return fail("generic");
}
