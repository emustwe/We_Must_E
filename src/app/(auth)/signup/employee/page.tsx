import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { EmployeeSignupForm } from "@/components/auth/employee-signup-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("signup");
  return { title: t("employeeTitle") };
}

export default async function EmployeeSignupPage() {
  const t = await getTranslations("signup");
  const tc = await getTranslations("common");
  return (
    <AuthShell
      title={t("employeeTitle")}
      subtitle={t("employeeSubtitle")}
      footer={
        <div className="space-y-2">
          <p>
            {t("haveAccount")}{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              {tc("logIn")}
            </Link>
          </p>
          <p>
            {t("hiring")}{" "}
            <Link href="/signup/employer" className="font-medium text-primary hover:underline">
              {t("employerLink")}
            </Link>
          </p>
        </div>
      }
    >
      <EmployeeSignupForm />
    </AuthShell>
  );
}
