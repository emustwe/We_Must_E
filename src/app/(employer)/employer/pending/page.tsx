import { Check, Clock, PauseCircle, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SignOutEverywhereCard } from "@/components/layout/sign-out-everywhere";
import { getEmployerAccount } from "@/lib/auth/employer";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("employer");
  return { title: t("pendingTitle") };
}

export default async function EmployerPendingPage() {
  const { employer } = await getEmployerAccount();
  if (employer?.status === "approved") redirect("/employer");
  const t = await getTranslations("employer");
  const te = await getTranslations("employee");

  if (employer?.status === "suspended") {
    return (
      <div className="animate-in-fast mx-auto max-w-lg space-y-4 py-8 text-center">
        <PauseCircle className="mx-auto size-10 text-muted-foreground" aria-hidden="true" />
        <h1 className="text-2xl font-semibold tracking-tight">{t("suspendedTitle")}</h1>
        <p className="leading-relaxed text-muted-foreground">{t("suspendedBody")}</p>
      </div>
    );
  }

  const steps = [
    { label: t("pendingStep1"), state: "done" },
    { label: t("pendingStep2"), state: "current" },
    { label: t("pendingStep3"), state: "upcoming" },
  ] as const;

  return (
    <div className="animate-in-fast mx-auto max-w-lg space-y-8 py-4 sm:py-8">
      <div className="space-y-3 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-accent/15 text-brand-accent-foreground dark:text-brand-accent">
          <Clock className="size-7" aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          {t("pendingTitle")}
        </h1>
        <p className="leading-relaxed text-muted-foreground">
          {t("pendingBody", { company: employer?.company_name || "" })}
        </p>
      </div>

      <ol className="space-y-0 rounded-2xl border bg-card p-5" aria-label={t("pendingTitle")}>
        {steps.map((step, i) => (
          <li key={step.label} className="relative flex gap-4 pb-6 last:pb-0">
            {i < steps.length - 1 ? (
              <span
                className="absolute start-4 top-9 h-[calc(100%-2.25rem)] w-px bg-border"
                aria-hidden="true"
              />
            ) : null}
            <span
              className={cn(
                "relative flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                step.state === "done" && "bg-success text-success-foreground",
                step.state === "current" &&
                  "bg-primary text-primary-foreground ring-4 ring-primary/15",
                step.state === "upcoming" && "bg-muted text-muted-foreground",
              )}
              aria-current={step.state === "current" ? "step" : undefined}
            >
              {step.state === "done" ? <Check className="size-4" aria-hidden="true" /> : i + 1}
            </span>
            <span
              className={cn(
                "pt-1 text-sm",
                step.state === "upcoming" ? "text-muted-foreground" : "font-medium",
              )}
            >
              {step.label}
            </span>
          </li>
        ))}
      </ol>

      <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="size-4" aria-hidden="true" />
        {t("pendingEmailNote")}
      </p>

      <SignOutEverywhereCard body={te("securityBody")} />
    </div>
  );
}
