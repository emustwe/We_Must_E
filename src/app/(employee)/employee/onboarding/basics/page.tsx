import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BasicsForm } from "@/components/onboarding/basics-form";
import { WizardShell } from "@/components/onboarding/wizard-shell";
import type { CityId } from "@/lib/jobs/meta";
import { nextStepHref } from "@/lib/onboarding/nav";
import { getOnboardingState } from "@/lib/onboarding/state";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding.basics");
  return { title: t("title") };
}

export default async function BasicsStep() {
  const state = await getOnboardingState();
  const t = await getTranslations("onboarding.basics");
  const e = state.employee;
  return (
    <WizardShell step="basics" state={state} title={t("title")} subtitle={t("subtitle")}>
      <BasicsForm
        nextHref={nextStepHref(state.steps, "basics")}
        defaults={{
          headline: e?.headline ?? "",
          cityEmirate: (e?.city_emirate as CityId) ?? "Dubai",
          languages: e?.languages ?? [],
          skills: e?.skills ?? [],
          availability: e?.availability ?? [],
          expectedPayRange: e?.expected_pay_range ?? "",
          phone: state.contact?.phone ?? "",
          whatsapp: state.contact?.whatsapp ?? "",
        }}
      />
    </WizardShell>
  );
}
