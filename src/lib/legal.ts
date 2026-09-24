// Bump a version when the corresponding document changes; users are then asked
// to accept again and a new row is written to public.consents.
export const CONSENT_VERSIONS = {
  terms: "2026-09-24",
  privacy: "2026-09-24",
  data_sharing: "2026-09-24",
} as const;

// PLACEHOLDER — client to replace with the real support address.
export const SUPPORT_EMAIL = "hello@wemuste.example";
