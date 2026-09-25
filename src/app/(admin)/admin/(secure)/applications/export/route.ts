import { filterQueryRows } from "@/lib/admin/export-queries";
import { csvResponse, toCsv } from "@/lib/admin/csv";
import { requireAdminMfa } from "@/lib/auth/session";
import { dbFail } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";

// Applications as CSV, with the same filters as the page. Contains names and
// phone numbers, so: MFA admins only (RLS enforces it too), logged first, and
// never cached.
export async function GET(request: Request) {
  await requireAdminMfa();
  const supabase = await createClient();
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const { data, error } = await filterQueryRows(supabase, params);
  if (error) {
    dbFail("admin-export-applications", error);
    return new Response("Export failed", { status: 500 });
  }
  const { error: logError } = await supabase.rpc("log_admin_export", {
    p_kind: "applications",
    p_rows: data.length,
  });
  if (logError) {
    dbFail("admin-export-applications-log", logError);
    return new Response("Export failed", { status: 500 });
  }
  const body = toCsv(
    ["Applicant", "Phone", "Email", "Job", "Sponsor", "Area", "Status", "Applied at"],
    data.map((a) => [
      a.applicants?.full_name,
      a.applicants?.phone_e164,
      a.applicants?.email,
      a.jobs.title,
      a.jobs.employer_profiles?.company_name,
      a.jobs.location_label,
      a.status,
      a.submitted_at,
    ]),
  );
  return csvResponse(body, `wemuste-applications-${new Date().toISOString().slice(0, 10)}.csv`);
}
