import { AppHeader } from "@/components/layout/app-header";
import { requireRole } from "@/lib/auth/session";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireRole("admin");
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader homeHref="/admin" subtitle="Admin" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-10 sm:px-6">{children}</main>
    </div>
  );
}
