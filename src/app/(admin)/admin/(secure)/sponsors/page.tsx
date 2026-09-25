import { ChevronRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FormAlert } from "@/components/forms/form-alert";
import { SponsorLogo } from "@/components/sponsors/sponsor-logo";
import { Badge } from "@/components/admin/ui";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("employersTitle") };
}

const TONE = { approved: "success", suspended: "danger", pending: "muted" } as const;

export default async function AdminSponsorsPage({ searchParams }: PageProps<"/admin/sponsors">) {
  const { deleted } = await searchParams;
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const { data: sponsors } = await supabase
    .from("employer_profiles")
    .select("user_id, company_name, contact_person, contact_email, status, logo_path, created_at")
    .order("created_at", { ascending: false })
    .limit(300);

  return (
    <div className="space-y-6 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">{t("employersTitle")}</h1>
        <Link href="/admin/sponsors/new" className={buttonVariants({ size: "touch" })}>
          <Plus className="size-4" aria-hidden="true" />
          {t("createEmployer")}
        </Link>
      </div>
      {deleted === "1" ? <FormAlert tone="success" message={t("sponsorDeleted")} /> : null}
      {!sponsors?.length ? (
        <p className="rounded-3xl border-2 border-dashed p-10 text-center text-muted-foreground">
          {t("noEmployers")}
        </p>
      ) : (
        <ul className="space-y-3">
          {sponsors.map((s) => (
            <li key={s.user_id}>
              <Link
                href={`/admin/sponsors/${s.user_id}`}
                className="shadow-float flex items-center gap-3 rounded-3xl bg-card p-4 transition-colors hover:bg-muted/40"
              >
                <SponsorLogo name={s.company_name} path={s.logo_path} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{s.company_name}</span>
                    <Badge tone={TONE[s.status]}>{t(`status.${s.status}`)}</Badge>
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                    {[s.contact_person, s.contact_email].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground rtl:-scale-x-100"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
