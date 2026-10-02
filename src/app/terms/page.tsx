import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/layout/legal-page";
import { companyLine } from "@/lib/company";
import { CONSENT_VERSIONS, SUPPORT_EMAIL } from "@/lib/legal";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return { title: t("termsTitle") };
}

// Written from how WemustE works today, for the client's lawyer to review.
// Still to decide (and then add here): Vera refunds and expiry, and which
// city's courts handle disputes.
const SECTIONS = [
  {
    heading: "1. Who we are",
    body: `WemustE is the job platform at www.wemuste.com. ${companyLine() ?? "WemustE is run by a company registered in Pakistan."}\nBy using WemustE you agree to these terms. Questions: ${SUPPORT_EMAIL}.`,
  },
  {
    heading: "2. What WemustE does",
    body: "WemustE shows jobs on a map. Sponsors, which can be companies or individuals, post full-time jobs, part-time jobs and short jobs of 1 to 3 days. People apply through the WemustE steps: Exam, Execute and Engage.\nWemustE is not the employer. We don't take part in any agreement between a sponsor and a candidate, and we can't promise that a job leads to a hire or that a candidate is right for a job.",
  },
  {
    heading: "3. Who can use WemustE",
    body: "You must be at least 18 years old. The information you give us must be true and your own. If you have an account, keep your password private: you are responsible for what is done with your account.",
  },
  {
    heading: "4. For people looking for work",
    body: "Applying is free. WemustE never asks candidates for money, and sponsors must never ask for it either: if anyone asks you to pay for a job, don't pay and tell us.\nYour application is shared with the sponsor of the job you apply for. Your name, phone number, email and CV stay hidden until the sponsor chooses to contact you. How long we keep your application, and how to have it deleted, is explained in our Privacy Policy.",
  },
  {
    heading: "5. For sponsors",
    body: "We check every request to become a sponsor and every job before it goes on the map. We may ask for changes, and we may hide or remove a job or account that breaks these terms.\nPost only real, lawful jobs, with honest details about the work, the place and the pay. Follow the employment laws of the country where the job is.\nUse candidates' information only to consider them for that job. Don't copy, share, sell or export it, and don't keep it after you have made your choice.",
  },
  {
    heading: "6. Vera",
    body: "Vera is WemustE's credit. Sponsors use it to open candidates' contact details; seeing applications is free. Prices are shown on the Buy Vera page before you pay.\nVera can only be used on WemustE. It isn't money and can't be transferred to someone else. If something goes wrong with a payment, email us with the date and amount and we will look into it.",
  },
  {
    heading: "7. What is not allowed",
    body: "Fake or misleading jobs, scams, asking candidates for money, harassment, discrimination, jobs that break the law, collecting data from WemustE with automated tools, and trying to get around the platform's security. We may suspend or close accounts that do these things, and report them to the authorities where needed.",
  },
  {
    heading: "8. Closing your account",
    body: "You can delete your account at any time from your Account page. We may suspend or close an account that breaks these terms. What happens to your data is explained in our Privacy Policy.",
  },
  {
    heading: "9. Our responsibility",
    body: "We work to keep WemustE safe and running, but we can't promise it will always be available or free of mistakes. As far as the law allows, WemustE is not responsible for what sponsors and candidates agree or do between themselves, or for losses that come from using the platform. Nothing in these terms removes rights you have under the law of your own country.",
  },
  {
    heading: "10. Law and changes",
    body: "These terms are governed by the laws of Pakistan, and disputes are handled by the courts of Pakistan.\nWe may update these terms; the version date at the top shows when they last changed.",
  },
];

export default async function TermsPage() {
  const t = await getTranslations("legal");
  return (
    <LegalPage
      title={t("termsTitle")}
      version={CONSENT_VERSIONS.terms}
      sections={SECTIONS}
      draft={false}
    />
  );
}
