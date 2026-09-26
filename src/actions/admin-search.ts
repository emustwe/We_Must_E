"use server";

import { requireAdminMfa } from "@/lib/auth/session";
import { dbFail } from "@/lib/db-errors";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";

export type SearchHit = {
  kind: "applicant" | "job" | "sponsor";
  href: string;
  title: string;
  sub: string;
};

// The top bar's search (Ctrl K): applicants, jobs and sponsors. Runs as the
// admin (MFA session), so RLS applies; nothing is logged or stored.
export async function adminSearch(input: unknown): Promise<ActionResult<SearchHit[]>> {
  if (typeof input !== "string") return fail("invalidInput");
  // Only letters, digits, spaces and a few name characters reach the query.
  const q = input
    .replace(/[^\p{L}\p{N} '.&-]/gu, "")
    .trim()
    .slice(0, 60);
  if (q.length < 2) return ok([]);
  await requireAdminMfa();
  const supabase = await createClient();
  const like = `%${q}%`;
  const [apps, jobs, sponsors] = await Promise.all([
    supabase
      .from("applications")
      .select("id, status, contact_name, jobs(title)")
      .neq("status", "in_progress")
      .ilike("contact_name", like)
      .order("submitted_at", { ascending: false })
      .limit(5),
    supabase
      .from("jobs")
      .select("id, title, location_label, employer_profiles(company_name)")
      .ilike("title", like)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("employer_profiles")
      .select("user_id, company_name, contact_person")
      .ilike("company_name", like)
      .order("company_name")
      .limit(5),
  ]);
  const error = apps.error ?? jobs.error ?? sponsors.error;
  if (error) return dbFail("admin-search", error);
  return ok([
    ...(apps.data ?? []).map((a) => ({
      kind: "applicant" as const,
      href: `/admin/applications/${a.id}`,
      title: a.contact_name ?? "—",
      sub: a.jobs?.title ?? "",
    })),
    ...(jobs.data ?? []).map((j) => ({
      kind: "job" as const,
      href: `/admin/jobs?job=${j.id}`,
      title: j.title,
      sub: [j.employer_profiles?.company_name, j.location_label].filter(Boolean).join(" · "),
    })),
    ...(sponsors.data ?? []).map((s) => ({
      kind: "sponsor" as const,
      href: `/admin/sponsors/${s.user_id}`,
      title: s.company_name,
      sub: s.contact_person ?? "",
    })),
  ]);
}
