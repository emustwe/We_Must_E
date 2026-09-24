import { requireRole } from "@/lib/auth/session";

export default async function EmployeeLayout({ children }: LayoutProps<"/employee">) {
  await requireRole("employee");
  return <div className="flex min-h-dvh flex-col">{children}</div>;
}
