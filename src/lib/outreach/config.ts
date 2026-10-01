// Outreach emails: companies the team emails by hand, each with its own
// private video link (/w/<token>).

// Who signs the email (the team's choice: just "WemustE").
export const OUTREACH_SENDER = { name: "WemustE" };

// The marketing video (an MP4 on the site or in Supabase Storage). Until it
// is set, the page shows "Video coming soon".
export const OUTREACH_VIDEO_URL = null as string | null;

// The picture in the email (public: email apps must load it). Swap the file
// for a frame of the real video later; the address stays the same.
export const OUTREACH_THUMB_PATH = "/email/video.jpg";

// A link works for this many days after the email was sent.
export const OUTREACH_LINK_DAYS = 60;

export const OUTREACH_TOKEN = /^[0-9a-f]{32}$/;
export const isOutreachToken = (v: unknown): v is string =>
  typeof v === "string" && OUTREACH_TOKEN.test(v);

export const OUTREACH_STATUSES = ["new", "sent", "opened", "signed_up", "unsubscribed"] as const;
export type OutreachStatus = (typeof OUTREACH_STATUSES)[number];
