import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { adminSetJobStatus } from "@/actions/admin-panel";
import { ActionButton } from "@/components/admin/action-button";
import { Badge, PageTitle } from "@/components/admin/ui";
import { PayLabelServer } from "@/components/employer/pay-label-server";
import { CATEGORY_META } from "@/lib/jobs/meta";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("jobsTitle") };
}

const TONE = { open: "success", paused: "muted", closed: "muted", removed: "danger" } as const;

export default async function AdminJobsPage() {
  const t = await getTranslations("admin");
  const tj = await getTranslations("jobStatus");
  const format = await getFormatter();
  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from("jobs")
    .select(
      "id, title, category, status, pay_min, pay_max, pay_period, currency, area_label, city_emirate, created_at, employer_profiles(company_name), job_applications(count)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <PageTitle title={t("jobsTitle")} />
      {!jobs?.length ? (
        <p className="rounded-3xl border-2 border-dashed p-10 text-center text-muted-foreground">
          {t("noJobs")}
        </p>
      ) : (
        <ul className="space-y-3">
          {jobs.map((job) => {
            const meta = CATEGORY_META[job.category];
            return (
              <li
                key={job.id}
                className="shadow-float flex flex-col gap-3 rounded-3xl bg-card p-4 sm:flex-row sm:items-center"
              >
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-2xl text-xl",
                    meta.tint,
                  )}
                  aria-hidden="true"
                >
                  {meta.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{job.title}</p>
                    <Badge tone={TONE[job.status]}>{tj(job.status)}</Badge>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {job.employer_profiles?.company_name} · {job.area_label}, {job.city_emirate} ·{" "}
                    {format.dateTime(new Date(job.created_at), { dateStyle: "medium" })} ·{" "}
                    {job.job_applications[0]?.count ?? 0} ✋
                  </p>
                  <PayLabelServer
                    min={job.pay_min}
                    max={job.pay_max}
                    period={job.pay_period}
                    currency={job.currency}
                    className="text-sm font-semibold"
                  />
                </div>
                {job.status === "removed" ? (
                  <ActionButton
                    size="pill"
                    variant="secondary"
                    action={adminSetJobStatus.bind(null, { jobId: job.id, status: "open" })}
                  >
                    {t("restoreJob")}
                  </ActionButton>
                ) : (
                  <ActionButton
                    size="pill"
                    variant="ghost"
                    className="text-destructive"
                    confirm={t("removeConfirm")}
                    action={adminSetJobStatus.bind(null, { jobId: job.id, status: "removed" })}
                  >
                    {t("removeJob")}
                  </ActionButton>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
