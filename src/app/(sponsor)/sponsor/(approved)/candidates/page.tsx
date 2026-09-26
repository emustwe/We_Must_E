import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { btn, PageHeader } from "@/components/admin/wm";
import { CandidateRow } from "@/components/sponsors/candidate-row";
import { Crumbs } from "@/components/sponsors/sponsor-shell";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ecoins");
  return { title: t("candidatesTitle") };
}

// Every candidate the Wemuste team approved for this sponsor's jobs.
export default async function SponsorCandidatesPage({
  searchParams,
}: PageProps<"/sponsor/candidates">) {
  const query = await searchParams;
  const page =
    typeof query.page === "string" && /^\d{1,4}$/.test(query.page) ? Number(query.page) : 0;
  const t = await getTranslations("ecoins");
  const tu = await getTranslations("sponsorUi");
  const supabase = await createClient();
  const { data: rows } = await supabase.rpc("sponsor_all_candidates", { p_page: page });
  const total = Number(rows?.[0]?.total ?? 0);
  const locked = Number(rows?.[0]?.locked_total ?? 0);

  return (
    <>
      <Crumbs items={[{ label: t("candidatesTitle") }]} />
      <PageHeader
        title={t("candidatesTitle")}
        body={`${locked ? t("lockedCount", { count: locked }) : t("candidatesBody")} ${tu("retentionNote")}`}
      />
      {!rows?.length ? (
        <p className="m-0 rounded-3xl border-[1.5px] border-dashed border-[#C9D1DD] bg-white p-8 text-center text-sm font-medium text-wm-caption">
          {t("noCandidates")}
        </p>
      ) : (
        <ul className="m-0 grid list-none gap-2.5 p-0 lg:grid-cols-2">
          {rows.map((c) => (
            <li key={c.application_id}>
              <CandidateRow
                jobId={c.job_id}
                applicationId={c.application_id}
                name={c.full_name}
                jobTitle={c.job_title}
                sharedAt={c.reviewed_at}
                unlocked={c.unlocked}
              />
            </li>
          ))}
        </ul>
      )}
      {total > 20 ? (
        <nav className="flex justify-center gap-2" aria-label={t("candidatesTitle")}>
          {page > 0 ? (
            <Link href={`/sponsor/candidates?page=${page - 1}`} className={btn("secondary", "sm")}>
              {t("prev")}
            </Link>
          ) : null}
          {(page + 1) * 20 < total ? (
            <Link href={`/sponsor/candidates?page=${page + 1}`} className={btn("secondary", "sm")}>
              {t("next")}
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}
