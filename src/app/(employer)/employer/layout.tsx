import { AppHeader } from "@/components/layout/app-header";
import { requireRole } from "@/lib/auth/session";

export default async function EmployerLayout({ children }: LayoutProps<"/employer">) {
  await requireRole("employer");
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader homeHref="/employer" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
