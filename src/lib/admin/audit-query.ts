import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sinceFor } from "@/lib/admin/app-filters";
import { AUDIT_GROUPS, type AuditGroup } from "@/lib/admin/audit-text";
import type { Database } from "@/types/database";

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export type AuditFilters = {
  group?: AuditGroup;
  who?: "admins" | "sponsors";
  date?: "today" | "7" | "30";
  action?: string;
  page: number;
};

export function parseAuditFilters(p: Record<string, string | string[] | undefined>): AuditFilters {
  const group = one(p.group);
  const who = one(p.who);
  const date = one(p.date);
  const action = one(p.action);
  return {
    group: group && group in AUDIT_GROUPS ? (group as AuditGroup) : undefined,
    who: who === "admins" || who === "sponsors" ? who : undefined,
    date: date === "today" || date === "7" || date === "30" ? date : undefined,
    // An exact code (links from other pages), e.g. application.reviewed.
    action: action && /^[a-z_]+\.[a-z_]+$/.test(action) ? action : undefined,
    page: /^\d{1,4}$/.test(one(p.page) ?? "") ? Number(p.page) : 0,
  };
}

export async function auditQuery(
  supabase: SupabaseClient<Database>,
  f: AuditFilters,
  range: [number, number],
) {
  let query = supabase
    .from("audit_logs")
    .select("id, actor_id, action, target_type, target_id, metadata, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(range[0], range[1]);
  if (f.action) query = query.eq("action", f.action);
  else if (f.group)
    query = query.or(AUDIT_GROUPS[f.group].map((prefix) => `action.like.${prefix}%`).join(","));
  const since = sinceFor(f.date);
  if (since) query = query.gte("created_at", since);
  if (f.who) {
    const { data } =
      f.who === "admins"
        ? await supabase.from("profiles").select("id").eq("role", "admin").limit(500)
        : await supabase.from("profiles").select("id").eq("role", "employer").limit(2000);
    const ids = (data ?? []).map((r) => r.id);
    query = query.in("actor_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }
  return query;
}
