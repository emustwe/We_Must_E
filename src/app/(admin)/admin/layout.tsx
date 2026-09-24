import { AppHeader } from "@/components/layout/app-header";
import { requireRole } from "@/lib/auth/session";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireRole("admin");
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader homeHref="/admin" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
