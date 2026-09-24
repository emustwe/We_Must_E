import { redirect } from "next/navigation";
import { EmployerTabs } from "@/components/layout/employer-tabs";
import { getEmployerAccount } from "@/lib/auth/employer";

// Approved employers who have replaced their temporary password only. RLS
// independently gives pending or suspended employers nothing.
export default async function ApprovedEmployerLayout({ children }: { children: React.ReactNode }) {
  const { employer } = await getEmployerAccount();
  if (employer?.must_change_password) redirect("/employer/welcome");
  if (employer?.status !== "approved") redirect("/employer/pending");
  return (
    <>
      <EmployerTabs />
      <div className="pt-4">{children}</div>
    </>
  );
}
