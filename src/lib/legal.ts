// Bump a version when the corresponding document changes; users are then asked
// to accept again and a new row is written to public.consents.
export const CONSENT_VERSIONS = {
  terms: "2026-09-24",
  privacy: "2026-09-26",
  data_sharing: "2026-09-24",
} as const;

// Where people ask for their data to be seen, corrected or deleted. Temporary
// until the company has an official address: change it here only.
export const SUPPORT_EMAIL = "emustwe@gmail.com";
// Promised in the privacy policy.
export const REPLY_WORKING_DAYS = 7;
// A sent application (with CV and videos) is deleted when the job closes, or
// this many days after it was sent if the job is still open.
export const RETENTION_DAYS = 30;
