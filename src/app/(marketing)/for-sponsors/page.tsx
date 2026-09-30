import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { SponsorRequestForm } from "@/components/sponsors/sponsor-request-form";
import { SUPPORT_EMAIL } from "@/lib/legal";
import { outreachByToken } from "@/server/outreach";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("forEmployers");
  return { title: t("title") };
}

// Companies can't sign up themselves: they send a request, and the WemustE
// team checks them and creates their sponsor account.
export default async function ForEmployersPage({ searchParams }: PageProps<"/for-sponsors">) {
  // A salesperson's link (/for-sponsors?ref=CODE) fills in their code; the
  // private link from our outreach email (?c=...) fills in the company too.
  const { ref, c } = await searchParams;
  const contact = await outreachByToken(c);
  const referralCode =
    typeof ref === "string" && /^[A-Za-z0-9-]{3,20}$/.test(ref)
      ? ref
      : (contact?.referral_code ?? "");
  const initial = contact
    ? {
        companyName: contact.company,
        contactPerson: contact.name,
        email: contact.email,
        outreachToken: c as string,
      }
    : undefined;
  const t = await getTranslations("forEmployers");
  const tc = await getTranslations("common");
  const steps = [t("step1"), t("step2"), t("step3")];
  const intro = (
    <>
      <h2 className="m-0 text-[28px] leading-tight font-extrabold tracking-[-0.8px]">
        {t("title")}
      </h2>
      <p className="m-0 mt-2 text-[15px] leading-relaxed font-medium text-wm-slate">{t("body")}</p>
      <ol className="m-0 mt-5 flex list-none flex-col gap-3 p-0">
        {steps.map((step, i) => (
          <li
            key={step}
            className="flex items-center gap-3 rounded-2xl bg-wm-mist p-3.5 text-sm font-bold"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-wm-blue">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </>
  );
  return (
    <AuthShell
      title={t("formTitle")}
      aside={intro}
      footer={
        <>
          {t("haveLogin")}{" "}
          <Link href="/login" className="font-semibold text-wm-blue hover:underline">
            {tc("logIn")}
          </Link>
        </>
      }
    >
      <SponsorRequestForm referralCode={referralCode} initial={initial} />
      <p className="mt-4 text-center text-xs text-wm-caption">
        {t("contactNote", { email: SUPPORT_EMAIL })}
      </p>
    </AuthShell>
  );
}
