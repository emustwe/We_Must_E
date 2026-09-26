import { redirect } from "next/navigation";
import { getEmployerAccount } from "@/lib/auth/employer";

// Approved employers who have replaced their temporary password only. RLS
// independently gives pending or suspended employers nothing.
export default async function ApprovedEmployerLayout({ children }: { children: React.ReactNode }) {
  const { employer } = await getEmployerAccount();
  if (employer?.must_change_password) redirect("/sponsor/welcome");
  if (employer?.status !== "approved") redirect("/sponsor/pending");
  return <>{children}</>;
}
