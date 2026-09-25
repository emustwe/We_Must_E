import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type Actor = { name: string | null; role: Database["public"]["Enums"]["user_role"] | null };

// Who did an audited action: the sponsor's company name, or the person's name.
// audit_logs has no foreign keys (entries outlive deleted accounts), so a
// missing actor is "deleted"; no actor at all is the system.
export async function loadActors(
  supabase: SupabaseClient<Database>,
  ids: (string | null)[],
): Promise<Map<string, Actor>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  const out = new Map<string, Actor>();
  if (!unique.length) return out;
  const [{ data: people }, { data: companies }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role").in("id", unique),
    supabase.from("employer_profiles").select("user_id, company_name").in("user_id", unique),
  ]);
  for (const p of people ?? []) out.set(p.id, { name: p.full_name || null, role: p.role });
  for (const c of companies ?? [])
    out.set(c.user_id, { name: c.company_name, role: out.get(c.user_id)?.role ?? "employer" });
  return out;
}
