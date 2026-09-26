import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/layout/legal-page";
import { CONSENT_VERSIONS, REPLY_WORKING_DAYS, RETENTION_DAYS, SUPPORT_EMAIL } from "@/lib/legal";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return { title: t("privacyTitle") };
}

// Draft for the client's lawyer to review. The company's legal name, licence
// number and address are added once the trade licence is issued.
const SECTIONS = [
  {
    heading: "1. Who we are",
    body: `Wemuste runs the job platform at www.wemuste.com. [Company legal name, trade licence number and registered address: to be added.]\nQuestions or requests about your data: ${SUPPORT_EMAIL}.`,
  },
  {
    heading: "2. What we collect",
    body: "When you apply for a job: your name, phone number and email; your profile answers, such as country, city, nationality, languages and work experience (age and gender are optional); your CV; your video answers; your test and survey answers, including typing-test results; and when you did each step.\nFor security we also keep a coded (hashed) version of your internet address, which can't be turned back into the address.\nWe don't use advertising or tracking cookies. The site only uses the cookies it needs to work.",
  },
  {
    heading: "3. Why we use it",
    body: "To review your application for the job you chose, to share it with that job's employer (sponsor) if our team approves you, to contact you about the job, and to protect the platform from fraud and misuse.\nWe use your information on the basis of the consent you give when you send your application, under the UAE Personal Data Protection Law (Federal Decree-Law No. 45 of 2021). You can withdraw your consent at any time (see section 7).",
  },
  {
    heading: "4. Who can see it",
    body: "Your profile is never public. The Wemuste team reviews every application. A sponsor sees your details only after our team approves you for their job and the sponsor chooses to open your application. Sponsors never see your gender or age. Every time someone opens your video or CV, it is recorded.\nTo run the platform we use trusted service providers: Supabase (database and file storage), Vercel (website hosting), Resend (emails), Cloudflare (bot protection) and MapTiler (maps). They handle data only to provide their service to us.\nWe never sell your information.",
  },
  {
    heading: "5. Where it is stored",
    body: "Your information is stored with Supabase in Mumbai, India, and our website runs on Vercel servers in Mumbai. The UAE Personal Data Protection Law allows this with your consent and with our providers' security commitments. By sending your application, you agree to this.",
  },
  {
    heading: "6. How long we keep it",
    body: `Unfinished applications are deleted automatically after 48 hours.\nA sent application, including your CV and videos, is deleted automatically when the job closes, or ${RETENTION_DAYS} days (1 month) after you apply if the job is still open, whichever comes first. After that, neither sponsors nor Wemuste can see it.\nWe only keep a record that something happened (for example "a video was viewed"), without your personal details.`,
  },
  {
    heading: "7. Your rights",
    body: `You can ask us at any time to show you the information we hold about you, to correct it, to delete it immediately, or to stop using it (withdraw your consent).\nEmail ${SUPPORT_EMAIL} from the email address you applied with, or tell us the phone number you used. We reply within ${REPLY_WORKING_DAYS} working days.\nIf you're not happy with our answer, you can complain to the UAE Data Office.`,
  },
  {
    heading: "8. How we protect it",
    body: "Your information is encrypted when it is sent and kept in private storage. Videos and CVs open only through links that stop working after 5 minutes, only for our team and the sponsors you are shared with, and every view is recorded. Our team logs in with two-step verification.",
  },
  {
    heading: "9. Changes to this policy",
    body: "If we change this policy, we update the date at the top of this page. The version you agreed to is saved with your application.",
  },
];

export default async function PrivacyPage() {
  const t = await getTranslations("legal");
  return (
    <LegalPage
      title={t("privacyTitle")}
      version={CONSENT_VERSIONS.privacy}
      sections={SECTIONS}
      draft={false}
    />
  );
}
