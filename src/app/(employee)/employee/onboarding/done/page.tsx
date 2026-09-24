import { Check, ChevronRight, Circle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FinishForm } from "@/components/onboarding/finish-form";
import { WizardShell } from "@/components/onboarding/wizard-shell";
import { buttonVariants } from "@/components/ui/button";
import { getOnboardingState } from "@/lib/onboarding/state";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding.done");
  return { title: t("title") };
}

export default async function DoneStep() {
  const state = await getOnboardingState();
  const t = await getTranslations("onboarding.done");
  const ts = await getTranslations("onboarding.steps");

  if (state.submitted) {
    return (
      <WizardShell
        step="done"
        state={state}
        title={t("submittedTitle")}
        subtitle={t("submittedBody")}
      >
        <div className="space-y-6">
          <div className="rounded-[2rem] bg-success/10 p-8 text-center text-6xl" aria-hidden="true">
            🎉
          </div>
          <Link href="/employee" className={cn(buttonVariants({ size: "touch" }), "w-full")}>
            {t("toMap")}
          </Link>
        </div>
      </WizardShell>
    );
  }

  const rows = state.steps
    .filter((s) => s !== "done")
    .map((s) => ({
      step: s,
      ok: s === "cv" ? Boolean(state.cv) : state.done[s],
      optional: s === "cv",
    }));

  return (
    <WizardShell step="done" state={state} title={t("title")} subtitle={t("subtitle")}>
      <div className="space-y-6">
        <ul className="shadow-float divide-y overflow-hidden rounded-3xl bg-card">
          {rows.map((row) => (
            <li key={row.step}>
              <Link
                href={`/employee/onboarding/${row.step}`}
                className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/50"
              >
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full",
                    row.ok
                      ? "bg-success text-success-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {row.ok ? (
                    <Check className="size-4" aria-hidden="true" />
                  ) : (
                    <Circle className="size-3" aria-hidden="true" />
                  )}
                </span>
                <span className="flex-1 font-semibold">
                  {ts(row.step)}
                  {row.optional ? (
                    <span className="font-normal text-muted-foreground"> · {t("edit")}</span>
                  ) : null}
                </span>
                <ChevronRight
                  className="size-4 text-muted-foreground rtl:-scale-x-100"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
        <FinishForm ready={state.allRequiredDone} needsConsent={!state.hasDataSharingConsent} />
      </div>
    </WizardShell>
  );
}
