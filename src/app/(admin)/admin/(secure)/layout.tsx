import { AdminTabs } from "@/components/layout/admin-tabs";
import { requireAdminMfa } from "@/lib/auth/session";

// Everything under here needs aal2. RLS applies the same rule to every admin query.
export default async function SecureAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminMfa();
  return (
    <>
      <div className="pb-24">{children}</div>
      <AdminTabs />
    </>
  );
}
