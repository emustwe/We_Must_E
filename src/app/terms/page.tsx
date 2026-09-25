import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/layout/legal-page";
import { CONSENT_VERSIONS } from "@/lib/legal";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return { title: t("termsTitle") };
}

// PLACEHOLDER — client/lawyer to replace. Outline only, not legal advice.
const SECTIONS = [
  {
    heading: "1. The service",
    body: "[PLACEHOLDER] What Wemuste provides to people looking for work and to sponsors.",
  },
  {
    heading: "2. Accounts",
    body: "[PLACEHOLDER] Eligibility, accurate information, one account per person, keeping your password safe.",
  },
  {
    heading: "3. Sponsors",
    body: "[PLACEHOLDER] Verification, approved use of candidate information, no copying or exporting of candidate data.",
  },
  {
    heading: "4. Acceptable use",
    body: "[PLACEHOLDER] No scams, fees charged to candidates, harassment or misuse of the platform.",
  },
  {
    heading: "5. Ending your account",
    body: "[PLACEHOLDER] How you or Wemuste can close an account and what happens to data.",
  },
  {
    heading: "6. Liability and law",
    body: "[PLACEHOLDER] Limitations of liability, governing law and dispute resolution.",
  },
];

export default async function TermsPage() {
  const t = await getTranslations("legal");
  return <LegalPage title={t("termsTitle")} version={CONSENT_VERSIONS.terms} sections={SECTIONS} />;
}
