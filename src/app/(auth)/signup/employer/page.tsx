import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { EmployerSignupForm } from "@/components/auth/employer-signup-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("signup");
  return { title: t("employerTitle") };
}

export default async function EmployerSignupPage() {
  const t = await getTranslations("signup");
  const tc = await getTranslations("common");
  return (
    <AuthShell
      audience="employer"
      title={t("employerTitle")}
      subtitle={t("employerSubtitle")}
      footer={
        <div className="space-y-2">
          <p>
            {t("haveAccount")}{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              {tc("logIn")}
            </Link>
          </p>
          <p>
            {t("lookingForWork")}{" "}
            <Link href="/signup/employee" className="font-medium text-primary hover:underline">
              {t("employeeLink")}
            </Link>
          </p>
        </div>
      }
    >
      <EmployerSignupForm />
    </AuthShell>
  );
}
