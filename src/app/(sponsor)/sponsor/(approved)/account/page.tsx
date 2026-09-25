import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DeleteAccountCard } from "@/components/layout/delete-account";
import { SignOutEverywhereCard } from "@/components/layout/sign-out-everywhere";
import { EcoinHistory } from "@/components/sponsors/ecoin-history";
import { LogoUploader } from "@/components/sponsors/logo-uploader";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("title") };
}

export default async function EmployerAccountPage() {
  const t = await getTranslations("account");
  const te = await getTranslations("employee");
  const tc = await getTranslations("ecoins");
  const profile = await requireRole("employer");
  const supabase = await createClient();
  const { data: sponsor } = await supabase
    .from("employer_profiles")
    .select("company_name, logo_path, ecoin_balance")
    .eq("user_id", profile.id)
    .single();
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-3xl font-extrabold tracking-tight">{t("title")}</h1>
      {sponsor ? (
        <section className="shadow-float space-y-4 rounded-3xl bg-card p-5">
          <h2 className="text-lg font-bold">{t("logoTitle")}</h2>
          <LogoUploader
            employerId={profile.id}
            name={sponsor.company_name}
            path={sponsor.logo_path}
          />
        </section>
      ) : null}
      {sponsor ? (
        <section
          id="ecoins"
          className="shadow-float scroll-mt-24 space-y-3 rounded-3xl bg-card p-5"
        >
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold">{tc("accountTitle")}</h2>
            <p className="text-2xl font-extrabold tabular-nums">{sponsor.ecoin_balance}</p>
          </div>
          <p className="text-sm text-muted-foreground">{tc("accountBody")}</p>
          <EcoinHistory employerId={profile.id} />
        </section>
      ) : null}
      <SignOutEverywhereCard body={te("securityBody")} />
      <DeleteAccountCard body={t("employerDeleteBody")} />
    </div>
  );
}
