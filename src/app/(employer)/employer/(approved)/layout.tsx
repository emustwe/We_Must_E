import { redirect } from "next/navigation";
import { getEmployerAccount } from "@/lib/auth/employer";

// Only approved employers get past this point. RLS independently returns
// nothing to pending or suspended employers.
export default async function ApprovedEmployerLayout({ children }: { children: React.ReactNode }) {
  const { employer } = await getEmployerAccount();
  if (employer?.status !== "approved") redirect("/employer/pending");
  return children;
}
