import { idSchema } from "@/lib/validations/jobs";

const STATUSES = ["submitted", "approved", "rejected"] as const;
type Status = (typeof STATUSES)[number];
const DATES = ["today", "7", "30"] as const;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export type AppFilters = {
  status: Status | undefined;
  statusParam: string;
  job?: string;
  sponsor?: string;
  area?: string;
  date?: (typeof DATES)[number];
  page: number;
};

// Filters come from the URL: validate each one.
export function parseFilters(params: Record<string, string | string[] | undefined>): AppFilters {
  // Applications go straight to the sponsor now: "all" by default.
  const statusParam = one(params.status) ?? "all";
  const area = (one(params.area) ?? "")
    .replace(/[^\p{L}\p{N} '-]/gu, "")
    .trim()
    .slice(0, 60);
  return {
    statusParam:
      statusParam === "all" || STATUSES.includes(statusParam as Status) ? statusParam : "all",
    status: statusParam === "all" ? undefined : STATUSES.find((s) => s === statusParam),
    job: idSchema.safeParse(one(params.job)).data,
    sponsor: idSchema.safeParse(one(params.sponsor)).data,
    area: area || undefined,
    date: DATES.find((d) => d === one(params.date)),
    page: /^\d{1,4}$/.test(one(params.page) ?? "") ? Number(params.page) : 0,
  };
}

export function sinceFor(date: AppFilters["date"], now = new Date()) {
  if (!date) return undefined;
  const d = new Date(now);
  if (date === "today") d.setHours(0, 0, 0, 0);
  else d.setDate(d.getDate() - Number(date));
  return d.toISOString();
}

export function filterQuery(f: AppFilters, extra: Record<string, string> = {}) {
  const p = new URLSearchParams();
  if (f.statusParam !== "all") p.set("status", f.statusParam);
  if (f.job) p.set("job", f.job);
  if (f.sponsor) p.set("sponsor", f.sponsor);
  if (f.area) p.set("area", f.area);
  if (f.date) p.set("date", f.date);
  for (const [k, v] of Object.entries(extra)) p.set(k, v);
  return p.size ? `?${p}` : "";
}
