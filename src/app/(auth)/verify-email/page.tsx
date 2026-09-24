import { MailCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResendVerification } from "@/components/auth/resend-verification";
import { VerifyCodeForm } from "@/components/auth/verify-code-form";
import { FormAlert } from "@/components/forms/form-alert";
import { buttonVariants } from "@/components/ui/button";
import { maskEmail, readPendingEmail } from "@/lib/auth/pending-email";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("verify");
  return { title: t("title") };
}

export default async function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  const t = await getTranslations("verify");
  const params = await searchParams;
  const pending = await readPendingEmail();
  const masked = pending ? maskEmail(pending) : null;

  return (
    <AuthShell
      title={t("title")}
      footer={
        <>
          {t("wrongEmail")}{" "}
          <Link href="/signup/employee" className="font-medium text-primary hover:underline">
            {t("startOver")}
          </Link>
        </>
      }
    >
      {pending ? (
        <div className="space-y-6">
          {params.unconfirmed === "1" ? (
            <FormAlert tone="success" message={t("unconfirmed")} />
          ) : null}
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MailCheck className="size-6" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <p className="text-base leading-relaxed">
                {masked ? t("body", { email: masked }) : t("bodyNoEmail")}
              </p>
              <p className="text-sm text-muted-foreground">{t("tip")}</p>
            </div>
          </div>
          <VerifyCodeForm />
          <ResendVerification />
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-muted-foreground">{t("noPending")}</p>
          <Link href="/login" className={cn(buttonVariants({ size: "touch" }), "w-full")}>
            {t("startLink")}
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
