import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CvStep } from "@/components/onboarding/cv-step";
import { WizardShell } from "@/components/onboarding/wizard-shell";
import { nextStepHref } from "@/lib/onboarding/nav";
import { getOnboardingState } from "@/lib/onboarding/state";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding.cv");
  return { title: t("title") };
}

export default async function CvStepPage() {
  const state = await getOnboardingState();
  const t = await getTranslations("onboarding.cv");
  return (
    <WizardShell step="cv" state={state} title={t("title")} subtitle={t("subtitle")}>
      <CvStep
        userId={state.profile.id}
        cv={
          state.cv
            ? {
                sizeKb: Math.round(state.cv.size_bytes / 1024),
                type: state.cv.mime_type === "application/pdf" ? "pdf" : "docx",
              }
            : null
        }
        nextHref={nextStepHref(state.steps, "cv")}
      />
    </WizardShell>
  );
}
