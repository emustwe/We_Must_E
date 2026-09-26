import { loadActors } from "@/lib/admin/actors";
import { auditQuery, parseAuditFilters } from "@/lib/admin/audit-query";
import { csvResponse, fromOtherSite, toCsv } from "@/lib/admin/csv";
import { requireAdminMfa } from "@/lib/auth/session";
import { dbFail } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";

// The audit log as CSV, with the page's filters. MFA admins only; the export
// is itself logged.
export async function GET(request: Request) {
  if (fromOtherSite(request)) return new Response("Forbidden", { status: 403 });
  await requireAdminMfa();
  const supabase = await createClient();
  const f = parseAuditFilters(Object.fromEntries(new URL(request.url).searchParams));
  const { data, error } = await auditQuery(supabase, f, [0, 9999]);
  if (error || !data) {
    if (error) dbFail("admin-export-audit", error);
    return new Response("Export failed", { status: 500 });
  }
  const { error: logError } = await supabase.rpc("log_admin_export", {
    p_kind: "audit",
    p_rows: data.length,
  });
  if (logError) {
    dbFail("admin-export-audit-log", logError);
    return new Response("Export failed", { status: 500 });
  }
  const actors = await loadActors(
    supabase,
    data.map((r) => r.actor_id),
  );
  const body = toCsv(
    ["Time", "Who", "Role", "Action", "Target type", "Target id", "Details"],
    data.map((r) => {
      const a = r.actor_id ? actors.get(r.actor_id) : null;
      return [
        r.created_at,
        r.actor_id ? (a?.name ?? "Deleted user") : "System",
        a?.role ?? "",
        r.action,
        r.target_type,
        r.target_id,
        JSON.stringify(r.metadata ?? {}),
      ];
    }),
  );
  return csvResponse(body, `wemuste-audit-${new Date().toISOString().slice(0, 10)}.csv`);
}
