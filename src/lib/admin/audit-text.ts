import type { IconName } from "@/components/map/wm-icons";

// Plain-language audit entries (DESIGN_BRIEF "Audit log"): a sentence instead
// of the raw code, a link to the target and a short detail chip. The raw
// values stay available behind the expand chevron.

export type AuditRow = {
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: unknown;
};

export type AuditKey =
  | "videoViewed"
  | "cvViewed"
  | "appApproved"
  | "appRejected"
  | "appReviewed"
  | "jobApproved"
  | "jobRejected"
  | "jobStatus"
  | "sponsorStatus"
  | "sponsorPassword"
  | "sponsorLogo"
  | "sponsorDeleted"
  | "ecoinsAdded"
  | "candidateUnlocked"
  | "surveyLive"
  | "testLive"
  | "videoSetLive"
  | "accountDeleted"
  | "graded"
  | "answerKey"
  | "exportApplications"
  | "exportAudit"
  | "other";

export type AuditTone = "blue" | "green" | "red" | "grey";

export type Described = {
  key: AuditKey;
  icon: IconName;
  tone: AuditTone;
  target: "application" | "job" | "sponsor" | "survey" | "test" | "videoSet" | null;
  href: string | null;
  // Detail chip: a from -> to change, an amount, or a short id.
  chip: { kind: "change"; from: string; to: string } | { kind: "text"; text: string } | null;
};

const meta = (m: unknown): Record<string, unknown> =>
  m && typeof m === "object" && !Array.isArray(m) ? (m as Record<string, unknown>) : {};
const str = (v: unknown) => (typeof v === "string" ? v : "");
const short = (id: string) => id.replace(/-/g, "").slice(0, 8);

export const AUDIT_GROUPS = {
  applications: ["application.", "candidate."],
  jobs: ["job."],
  sponsors: ["employer.", "sponsor.", "ecoins."],
  content: ["survey.", "test.", "video_set."],
} as const;
export type AuditGroup = keyof typeof AUDIT_GROUPS;

export function describeAudit(row: AuditRow): Described {
  const m = meta(row.metadata);
  const id = row.target_id;
  const change = (from: unknown, to: unknown) =>
    str(from) || str(to) ? ({ kind: "change", from: str(from), to: str(to) } as const) : null;
  const target = (() => {
    switch (row.target_type) {
      case "application":
        return { target: "application" as const, href: id ? `/admin/applications/${id}` : null };
      case "job":
        return { target: "job" as const, href: id ? `/admin/jobs?job=${id}` : null };
      case "employer":
        return { target: "sponsor" as const, href: id ? `/admin/sponsors/${id}` : null };
      case "survey":
        return { target: "survey" as const, href: id ? `/admin/content/surveys/${id}` : null };
      case "test":
        return { target: "test" as const, href: id ? `/admin/content/tests/${id}` : null };
      case "video_set":
        return { target: "videoSet" as const, href: id ? `/admin/content/videos/${id}` : null };
      default:
        return { target: null, href: null };
    }
  })();
  const base = { ...target, chip: null };

  switch (row.action) {
    case "application.video_viewed":
      return {
        ...base,
        key: "videoViewed",
        icon: "eye",
        tone: "blue",
        chip: str(m.video) ? { kind: "text", text: short(str(m.video)) } : null,
      };
    case "application.cv_viewed":
      return { ...base, key: "cvViewed", icon: "fileText", tone: "blue" };
    case "application.reviewed": {
      const to = str(m.to);
      return {
        ...base,
        key: to === "approved" ? "appApproved" : to === "rejected" ? "appRejected" : "appReviewed",
        icon: to === "rejected" ? "close" : "check",
        tone: to === "rejected" ? "red" : "green",
        chip: change(m.from, m.to),
      };
    }
    case "job.approved":
      return {
        ...base,
        key: "jobApproved",
        icon: "pin",
        tone: "green",
        chip: change(m.from || "pending", "published"),
      };
    case "job.rejected":
      return {
        ...base,
        key: "jobRejected",
        icon: "pencil",
        tone: "red",
        chip: change(m.from || "pending", "rejected"),
      };
    case "job.status_changed":
      return { ...base, key: "jobStatus", icon: "pin", tone: "grey", chip: change(m.from, m.to) };
    case "employer.status_changed":
      return {
        ...base,
        key: "sponsorStatus",
        icon: "building",
        tone: "grey",
        chip: change(m.from, m.to),
      };
    case "sponsor.password":
      return { ...base, key: "sponsorPassword", icon: "key", tone: "grey" };
    case "sponsor.logo":
      return { ...base, key: "sponsorLogo", icon: "building", tone: "grey" };
    case "sponsor.deleted":
      return { ...base, key: "sponsorDeleted", icon: "trash", tone: "red" };
    case "ecoins.added": {
      const amount = typeof m.amount === "number" ? m.amount : null;
      return {
        ...base,
        key: "ecoinsAdded",
        icon: "coin",
        tone: "green",
        chip:
          amount !== null
            ? { kind: "text", text: amount > 0 ? `+${amount}` : String(amount) }
            : null,
      };
    }
    case "candidate.unlocked":
      return { ...base, key: "candidateUnlocked", icon: "coin", tone: "blue" };
    case "survey.activated":
      return { ...base, key: "surveyLive", icon: "checklist", tone: "green" };
    case "test.activated":
      return { ...base, key: "testLive", icon: "flask", tone: "green" };
    case "video_set.activated":
      return { ...base, key: "videoSetLive", icon: "video", tone: "green" };
    case "account.deleted":
      return { ...base, key: "accountDeleted", icon: "trash", tone: "red" };
    case "application.graded":
      return { ...base, key: "graded", icon: "check", tone: "grey" };
    case "test.answer_key_set":
      return { ...base, key: "answerKey", icon: "flask", tone: "grey" };
    case "export.applications":
      return { ...base, key: "exportApplications", icon: "download", tone: "blue" };
    case "export.audit":
      return { ...base, key: "exportAudit", icon: "download", tone: "blue" };
    default:
      return { ...base, key: "other", icon: "info", tone: "grey" };
  }
}

export const TONE_COLORS: Record<AuditTone, [string, string]> = {
  blue: ["#EEF3FF", "#2457F5"],
  green: ["#D9F4E6", "#0B6B45"],
  red: ["#FDE3E4", "#C0262D"],
  grey: ["#F3F5F9", "#475569"],
};
