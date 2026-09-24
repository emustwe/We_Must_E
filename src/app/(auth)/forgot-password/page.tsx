import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("forgot");
  return { title: t("title") };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations("forgot");
  return (
    <AuthShell
      title={t("title")}
      subtitle={t("subtitle")}
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t("backToLogin")}
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
