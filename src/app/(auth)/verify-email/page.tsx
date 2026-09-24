import { MailCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResendVerification } from "@/components/auth/resend-verification";
import { maskEmail, readPendingEmail } from "@/lib/auth/pending-email";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("verify");
  return { title: t("title") };
}

export default async function VerifyEmailPage() {
  const t = await getTranslations("verify");
  const pending = await readPendingEmail();
  const masked = pending ? maskEmail(pending) : null;

  return (
    <AuthShell
      title={t("title")}
      footer={
        <>
          {t("wrongEmail")}{" "}
          <Link href="/" className="font-medium text-primary hover:underline">
            {t("startOver")}
          </Link>
        </>
      }
    >
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MailCheck className="size-6" aria-hidden="true" />
          </span>
          <div className="space-y-2">
            <p className="text-base leading-relaxed">
              {masked ? t("body", { email: masked }) : t("bodyNoEmail")}
            </p>
            <p className="text-sm text-muted-foreground">{t("tip")}</p>
          </div>
        </div>
        {pending ? <ResendVerification /> : null}
      </div>
    </AuthShell>
  );
}
