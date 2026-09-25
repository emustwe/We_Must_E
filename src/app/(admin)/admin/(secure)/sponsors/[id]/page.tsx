import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { EmployerStatusButton } from "@/components/admin/employer-status-button";
import { EcoinForm } from "@/components/admin/ecoin-form";
import { DeleteSponsor, SponsorPasswordForm } from "@/components/admin/sponsor-manage";
import { EcoinHistory } from "@/components/sponsors/ecoin-history";
import { Badge, Card } from "@/components/admin/ui";
import { LogoUploader } from "@/components/sponsors/logo-uploader";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validations/jobs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("sponsorTitle") };
}

const TONE = { approved: "success", suspended: "danger", pending: "muted" } as const;

export default async function AdminSponsorPage({ params }: PageProps<"/admin/sponsors/[id]">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const t = await getTranslations("admin");
  const te = await getTranslations("ecoins");
  const format = await getFormatter();
  const supabase = await createClient();
  const [{ data: s }, { count: jobs }] = await Promise.all([
    supabase
      .from("employer_profiles")
      .select(
        "user_id, company_name, contact_person, contact_email, contact_phone, trade_license_no, website, status, logo_path, ecoin_balance, created_at",
      )
      .eq("user_id", id)
      .maybeSingle(),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("employer_id", id),
  ]);
  if (!s) notFound();

  const rows = [
    [t("contactPerson"), s.contact_person],
    [t("email"), s.contact_email],
    [t("phone"), s.contact_phone],
    [t("tradeLicense"), s.trade_license_no],
    [t("website"), s.website],
    [t("jobsCount"), String(jobs ?? 0)],
    [t("createdOn"), format.dateTime(new Date(s.created_at), { dateStyle: "medium" })],
  ].filter(([, v]) => v);

  return (
    <div className="space-y-5">
      <Link
        href="/admin/sponsors"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        {t("backToEmployers")}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight break-words">{s.company_name}</h1>
        <Badge tone={TONE[s.status]}>{t(`status.${s.status}`)}</Badge>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="font-bold">{t("logoTitle")}</h2>
          <LogoUploader employerId={s.user_id} name={s.company_name} path={s.logo_path} />
        </Card>
        <Card>
          <h2 className="mb-3 font-bold">{t("detailsTitle")}</h2>
          <dl className="space-y-2 text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="flex flex-wrap gap-x-2">
                <dt className="text-muted-foreground">{label}:</dt>
                <dd className="font-semibold break-all">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4">
            <EmployerStatusButton employerId={s.user_id} status={s.status} />
          </div>
        </Card>
        <Card className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-bold">{te("adminTitle")}</h2>
            <p className="text-2xl font-extrabold tabular-nums">{s.ecoin_balance}</p>
          </div>
          <p className="text-sm text-muted-foreground">{te("adminBody")}</p>
          <EcoinForm employerId={s.user_id} />
          <EcoinHistory employerId={s.user_id} />
        </Card>
        <Card>
          <h2 className="mb-3 font-bold">{t("passwordTitle")}</h2>
          <SponsorPasswordForm employerId={s.user_id} />
        </Card>
        <Card className="border-2 border-destructive/30">
          <h2 className="mb-3 font-bold text-destructive">{t("deleteSponsor")}</h2>
          <DeleteSponsor employerId={s.user_id} companyName={s.company_name} />
        </Card>
      </div>
    </div>
  );
}
