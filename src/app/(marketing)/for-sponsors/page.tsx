import { Mail } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { buttonVariants } from "@/components/ui/button";
import { SUPPORT_EMAIL } from "@/lib/legal";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("forEmployers");
  return { title: t("title") };
}

// Employers can't sign up themselves; the Wemuste team creates their accounts.
export default async function ForEmployersPage() {
  const t = await getTranslations("forEmployers");
  const tc = await getTranslations("common");
  const steps = [t("step1"), t("step2"), t("step3")];
  return (
    <AuthShell
      title={t("title")}
      subtitle={t("body")}
      footer={
        <>
          {t("haveLogin")}{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            {tc("logIn")}
          </Link>
        </>
      }
    >
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li
            key={step}
            className="flex items-center gap-3 rounded-2xl bg-muted/70 p-3.5 text-sm font-semibold"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background text-primary">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className={cn(buttonVariants({ size: "touch" }), "mt-6 w-full")}
      >
        <Mail className="size-4" aria-hidden="true" />
        {t("contact")}
      </a>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {t("contactNote", { email: SUPPORT_EMAIL })}
      </p>
    </AuthShell>
  );
}
