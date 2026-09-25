import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CandidateRow } from "@/components/sponsors/candidate-row";
import { buttonVariants } from "@/components/ui/button";
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
  const supabase = await createClient();
  const { data: rows } = await supabase.rpc("sponsor_all_candidates", { p_page: page });
  const total = Number(rows?.[0]?.total ?? 0);
  const locked = Number(rows?.[0]?.locked_total ?? 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">{t("candidatesTitle")}</h1>
        <p className="mt-1 text-muted-foreground">
          {locked ? t("lockedCount", { count: locked }) : t("candidatesBody")}
        </p>
      </div>
      {!rows?.length ? (
        <p className="rounded-[2rem] border-2 border-dashed p-8 text-center text-sm text-muted-foreground">
          {t("noCandidates")}
        </p>
      ) : (
        <ul className="space-y-2.5">
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
            <Link
              href={`/sponsor/candidates?page=${page - 1}`}
              className={buttonVariants({ size: "pill", variant: "secondary" })}
            >
              {t("prev")}
            </Link>
          ) : null}
          {(page + 1) * 20 < total ? (
            <Link
              href={`/sponsor/candidates?page=${page + 1}`}
              className={buttonVariants({ size: "pill", variant: "secondary" })}
            >
              {t("next")}
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
