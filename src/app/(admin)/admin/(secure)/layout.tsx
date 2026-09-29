import { AdminShell } from "@/components/admin/shell";
import { requireAdminMfa } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { hoursAgo } from "@/lib/admin/since";

// Everything under here needs aal2. RLS applies the same rule to every admin query.
export default async function SecureAdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdminMfa();
  const supabase = await createClient();
  const count = { count: "exact" as const, head: true };
  // The sidebar badges: new applications (last 24 hours; they go straight to
  // sponsors) and what is waiting for review.
  const since24h = hoursAgo(24);
  const [apps, jobs, requests] = await Promise.all([
    supabase
      .from("applications")
      .select("id", count)
      .neq("status", "in_progress")
      .gte("submitted_at", since24h),
    supabase.from("jobs").select("id", count).eq("status", "pending"),
    supabase.from("sponsor_requests").select("id", count).eq("status", "new"),
  ]);
  return (
    <AdminShell
      counts={{
        applications: apps.count ?? 0,
        jobs: jobs.count ?? 0,
        requests: requests.count ?? 0,
      }}
      name={profile.full_name || "WemustE Admin"}
    >
      {children}
    </AdminShell>
  );
}
