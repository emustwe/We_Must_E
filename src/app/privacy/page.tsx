import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/layout/legal-page";
import { CONSENT_VERSIONS } from "@/lib/legal";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return { title: t("privacyTitle") };
}

// PLACEHOLDER — client/lawyer to replace. Outline only, not legal advice.
const SECTIONS = [
  {
    heading: "1. Who we are",
    body: "[PLACEHOLDER] Company name, registered address and contact details of the data controller.",
  },
  {
    heading: "2. What we collect",
    body: "[PLACEHOLDER] Account details, survey answers, test results, video answers, CVs and contact details you provide.",
  },
  {
    heading: "3. Who can see your information",
    body: "[PLACEHOLDER] Your profile is never public. Only sponsors approved and selected by Wemuste can see the parts of your profile Wemuste chooses to share.",
  },
  {
    heading: "4. Where it is stored",
    body: "[PLACEHOLDER] Hosting provider and region, and the legal basis for any transfer outside the UAE (PDPL).",
  },
  {
    heading: "5. How long we keep it",
    body: "[PLACEHOLDER] Retention periods and how to request deletion of your account and data.",
  },
  {
    heading: "6. Your rights",
    body: "[PLACEHOLDER] Access, correction, deletion, objection and how to contact us or the regulator.",
  },
];

export default async function PrivacyPage() {
  const t = await getTranslations("legal");
  return (
    <LegalPage title={t("privacyTitle")} version={CONSENT_VERSIONS.privacy} sections={SECTIONS} />
  );
}
