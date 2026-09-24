import { Check, X } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import type { OnboardingStep } from "@/lib/onboarding/constants";
import type { OnboardingState } from "@/lib/onboarding/state";
import { cn } from "@/lib/utils";

// Full-screen, one-step-at-a-time frame with a segmented progress bar.
export async function WizardShell({
  step,
  state,
  title,
  subtitle,
  children,
}: {
  step: OnboardingStep;
  state: OnboardingState;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const t = await getTranslations("onboarding");
  const index = state.steps.indexOf(step);
  const isDone = (s: OnboardingStep) =>
    s === "done" ? state.submitted : s === "cv" ? Boolean(state.cv) : state.done[s];

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-20 bg-background/90 px-4 pt-3 pb-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <Link
            href="/employee"
            aria-label={t("exit")}
            className="flex size-11 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/70"
          >
            <X className="size-5" aria-hidden="true" />
          </Link>
          <p className="text-sm font-semibold text-muted-foreground" aria-live="polite">
            {t("stepOf", { current: index + 1, total: state.steps.length })}
          </p>
          <span className="size-11" aria-hidden="true" />
        </div>
        <nav
          aria-label={t("stepOf", { current: index + 1, total: state.steps.length })}
          className="mx-auto mt-3 max-w-lg"
        >
          <ol className="flex gap-1.5">
            {state.steps.map((s, i) => (
              <li key={s} className="flex-1">
                <Link
                  href={`/employee/onboarding/${s}`}
                  aria-current={s === step ? "step" : undefined}
                  aria-label={`${t(`steps.${s}`)}${isDone(s) ? ` (${t("saved")})` : ""}`}
                  className="group block py-1.5"
                >
                  <span
                    className={cn(
                      "block h-1.5 rounded-full transition-colors",
                      i < index || isDone(s)
                        ? "bg-success"
                        : i === index
                          ? "bg-foreground"
                          : "bg-muted",
                    )}
                  />
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-4 pb-10 sm:px-6">
        <div className="animate-in-fast">
          <h1 className="text-[1.75rem] leading-tight font-extrabold tracking-tight text-balance">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1.5 text-base leading-relaxed text-muted-foreground">{subtitle}</p>
          ) : null}
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}

export function DoneBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-bold text-success">
      <Check className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}
