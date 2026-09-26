import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { signOutEverywhere } from "@/actions/auth";
import { btn, PageHeader } from "@/components/admin/wm";
import { DeleteAccountCard } from "@/components/layout/delete-account";
import { WmIcon } from "@/components/map/wm-icons";
import { EcoinHistory } from "@/components/sponsors/ecoin-history";
import { LogoUploader } from "@/components/sponsors/logo-uploader";
import { SponsorLogo } from "@/components/sponsors/sponsor-logo";
import { Crumbs } from "@/components/sponsors/sponsor-shell";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("title") };
}

// One settings row: label and help on the left, the control on the right.
function Row({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <div className="grid gap-3 border-t border-wm-line py-5 first:border-0 first:pt-0 last:pb-0 md:grid-cols-3 md:gap-6">
      <div className="flex flex-col gap-1">
        <h3 className="m-0 text-sm font-extrabold">{title}</h3>
        <p className="m-0 text-[13px] leading-[1.5] font-medium text-wm-slate">{body}</p>
      </div>
      <div className="min-w-0 md:col-span-2">{children}</div>
    </div>
  );
}

export default async function EmployerAccountPage() {
  const t = await getTranslations("account");
  const te = await getTranslations("employee");
  const tc = await getTranslations("ecoins");
  const tcom = await getTranslations("common");
  const tl = await getTranslations("sponsorLogo");
  const tu = await getTranslations("sponsorUi");
  const profile = await requireRole("employer");
  const supabase = await createClient();
  const { data: sponsor } = await supabase
    .from("employer_profiles")
    .select("company_name, logo_path, ecoin_balance")
    .eq("user_id", profile.id)
    .single();
  return (
    <>
      <Crumbs items={[{ label: t("title") }]} />
      <PageHeader title={t("title")} body={tu("accountBody")} />
      <section className="flex flex-col rounded-3xl bg-white p-6 shadow-wm-1">
        <h2 className="m-0 mb-5 text-lg font-extrabold tracking-[-0.3px]">
          {tu("companyProfile")}
        </h2>
        {sponsor ? (
          <Row title={t("logoTitle")} body={tl("hint")}>
            <div className="flex flex-wrap items-center gap-6">
              <LogoUploader
                employerId={profile.id}
                name={sponsor.company_name}
                path={sponsor.logo_path}
              />
              <div className="flex flex-col items-start gap-1.5">
                <span className="text-[11px] font-bold tracking-[0.4px] text-wm-caption uppercase">
                  {tu("onTheMap")}
                </span>
                <span className="flex h-9 items-center gap-2 rounded-full bg-white py-1 pr-3.5 pl-1 text-[13px] font-extrabold shadow-wm-2">
                  <SponsorLogo
                    name={sponsor.company_name}
                    path={sponsor.logo_path}
                    className="size-7 rounded-full text-[10px]"
                  />
                  {sponsor.company_name}
                </span>
              </div>
            </div>
          </Row>
        ) : null}
        {sponsor ? (
          <Row title={tu("companyName")} body={tu("companyNameBody")}>
            <div className="flex h-11 max-w-md items-center justify-between gap-3 rounded-[14px] border border-wm-line bg-[#F4F5F2] px-3.5 text-sm font-bold text-wm-body">
              <span className="truncate">{sponsor.company_name}</span>
              <span className="shrink-0 text-wm-caption">
                <WmIcon name="lock" size={15} stroke={2.2} />
              </span>
            </div>
          </Row>
        ) : null}
        <Row title={te("securityTitle")} body={te("securityBody")}>
          <form action={signOutEverywhere}>
            <button type="submit" className={btn("secondary")}>
              <WmIcon name="logout" size={16} stroke={2.2} />
              {tcom("signOutEverywhere")}
            </button>
          </form>
        </Row>
        <Row title={tu("dangerZone")} body={t("employerDeleteBody")}>
          <DeleteAccountCard bare />
        </Row>
      </section>
      {sponsor ? (
        <section
          id="ecoins"
          className="flex scroll-mt-24 flex-col gap-3 rounded-3xl bg-white p-6 shadow-wm-1"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="m-0 flex items-center gap-2 text-lg font-extrabold tracking-[-0.3px]">
              <span className="text-[#B7791F]">
                <WmIcon name="coin" size={19} stroke={2.2} />
              </span>
              {tc("accountTitle")}
            </h2>
            <span className="text-[28px] font-extrabold tracking-[-0.8px] tabular-nums">
              {sponsor.ecoin_balance}
            </span>
          </div>
          <p className="m-0 text-[13px] font-medium text-wm-slate">{tc("accountBody")}</p>
          <EcoinHistory employerId={profile.id} />
        </section>
      ) : null}
    </>
  );
}
