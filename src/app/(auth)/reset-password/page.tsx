import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reset");
  return { title: t("title") };
}

// Reached through /auth/confirm, which turns the emailed recovery link into a session.
export default async function ResetPasswordPage() {
  const t = await getTranslations("reset");
  const user = await getCurrentUser();

  if (!user) {
    return (
      <AuthShell title={t("expiredTitle")} subtitle={t("expiredBody")}>
        <Link href="/forgot-password" className={cn(buttonVariants({ size: "touch" }), "w-full")}>
          {t("requestNew")}
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t("title")} subtitle={t("subtitle")}>
      <ResetPasswordForm />
    </AuthShell>
  );
}
