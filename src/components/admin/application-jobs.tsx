import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { displayTitle, EmptyRow, PageHeader, StatusPill } from "@/components/admin/wm";
import { WmIcon } from "@/components/map/wm-icons";
import { createClient } from "@/lib/supabase/server";

const areaOf = (label: string) => label.split(",")[0]?.trim() || label;

// Applications, first by job: every job with applications, newest first.
// Opening one lists everyone who applied to it.
export async function ApplicationJobs() {
  const t = await getTranslations("adminUi");
  const format = await getFormatter();
  const supabase = await createClient();
  const { data: jobs } = await supabase.rpc("admin_application_jobs");
  return (
    <>
      <PageHeader title={t("nav.applications")} body={t("appsJobsBody")} />
      {!jobs?.length ? (
        <EmptyRow>{t("appsJobsEmpty")}</EmptyRow>
      ) : (
        <ul className="m-0 grid list-none gap-2.5 p-0 xl:grid-cols-2">
          {jobs.map((j) => (
            <li key={j.job_id} className="min-w-0">
              <Link
                href={`/admin/applications?job=${j.job_id}&status=all`}
                className="flex min-w-0 items-center gap-3.5 rounded-[20px] bg-white p-4 text-wm-ink no-underline shadow-wm-1 hover:shadow-wm-2"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-wm-tint text-wm-blue">
                  <WmIcon name="briefcase" size={19} stroke={2.1} />
                </span>
                <span className="flex min-w-0 grow flex-col gap-0.5">
                  <span className="truncate text-[15px] font-extrabold">
                    {displayTitle(j.title)}
                  </span>
                  <span className="truncate text-xs font-semibold text-wm-slate">
                    {j.company_name} · {areaOf(j.location_label)} ·{" "}
                    {t("appsJobsLast", {
                      date: format.dateTime(new Date(j.last_at), { dateStyle: "medium" }),
                    })}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-lg font-extrabold tabular-nums">
                    {t("appsJobsCount", { count: Number(j.total) })}
                  </span>
                  {Number(j.today) > 0 ? (
                    <StatusPill tone="blue">
                      {t("appsJobsToday", { count: Number(j.today) })}
                    </StatusPill>
                  ) : null}
                </span>
                <span className="text-wm-caption">
                  <WmIcon name="chevronRight" size={16} stroke={2.4} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
