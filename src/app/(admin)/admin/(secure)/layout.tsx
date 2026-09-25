import { AdminShell } from "@/components/admin/shell";
import { requireAdminMfa } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

// Everything under here needs aal2. RLS applies the same rule to every admin query.
export default async function SecureAdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdminMfa();
  const supabase = await createClient();
  const count = { count: "exact" as const, head: true };
  // The sidebar badges: what is waiting for review.
  const [apps, jobs] = await Promise.all([
    supabase.from("applications").select("id", count).eq("status", "submitted"),
    supabase.from("jobs").select("id", count).eq("status", "pending"),
  ]);
  return (
    <AdminShell
      counts={{ applications: apps.count ?? 0, jobs: jobs.count ?? 0 }}
      name={profile.full_name || "Wemuste Admin"}
    >
      {children}
    </AdminShell>
  );
}
