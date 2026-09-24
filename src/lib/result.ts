// Every server action returns one of these. Errors are message keys from
// messages/*.json (namespace "errors"), never raw database or auth messages.
export type ActionError =
  | "generic"
  | "invalidInput"
  | "rateLimited"
  | "invalidCredentials"
  | "emailNotConfirmed"
  | "weakPassword"
  | "captchaFailed"
  | "sessionExpired"
  | "samePassword"
  | "notFound"
  | "forbidden"
  | "profileIncomplete"
  | "alreadyRequested"
  | "tooManyPending"
  | "emailTaken"
  | "invalidFile"
  | "timeExpired"
  | "incomplete"
  | "inUse"
  | "meetingOpen"
  | "invalidCode"
  | "alreadyActive";

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: ActionError; fieldErrors?: Record<string, string> };

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
export const fail = (
  error: ActionError,
  fieldErrors?: Record<string, string>,
): ActionResult<never> => ({ ok: false, error, fieldErrors });
