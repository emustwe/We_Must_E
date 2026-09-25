import { requireRole } from "@/lib/auth/session";

// The whole admin uses the light Wemuste design (reference/admin/*.html).
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireRole("admin");
  return <div className="wm-ui min-h-dvh bg-wm-land font-sans text-wm-ink">{children}</div>;
}
