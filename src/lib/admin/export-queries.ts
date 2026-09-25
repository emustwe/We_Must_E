import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseFilters, sinceFor } from "@/lib/admin/app-filters";
import type { Database } from "@/types/database";

// The Applications page's filters, without paging (up to 5000 rows).
export function filterQueryRows(
  supabase: SupabaseClient<Database>,
  params: Record<string, string>,
) {
  const f = parseFilters(params);
  let query = supabase
    .from("applications")
    .select(
      "id, status, submitted_at, applicants(full_name, phone_e164, email), jobs!inner(title, location_label, city, employer_id, employer_profiles(company_name))",
    )
    .neq("status", "in_progress")
    .order("submitted_at", { ascending: false })
    .limit(5000);
  if (f.status) query = query.eq("status", f.status);
  if (f.job) query = query.eq("job_id", f.job);
  if (f.sponsor) query = query.eq("jobs.employer_id", f.sponsor);
  if (f.area) query = query.eq("jobs.city", f.area);
  const since = sinceFor(f.date);
  if (since) query = query.gte("submitted_at", since);
  return query;
}
