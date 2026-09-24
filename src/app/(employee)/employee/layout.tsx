import { AppHeader } from "@/components/layout/app-header";
import { requireRole } from "@/lib/auth/session";

export default async function EmployeeLayout({ children }: LayoutProps<"/employee">) {
  await requireRole("employee");
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader homeHref="/employee" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
