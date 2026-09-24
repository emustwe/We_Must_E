import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { adminSetJobStatus } from "@/actions/admin-panel";
import { ActionButton } from "@/components/admin/action-button";
import { AdminJobsMap } from "@/components/admin/jobs-map";
import { PageTitle } from "@/components/admin/ui";
import { JobStatusBadge } from "@/components/employer/job-status-badge";
import type { JobStatus } from "@/lib/jobs/meta";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("jobsTitle") };
}

const STATUSES = ["published", "hidden", "closed", "removed"] as const satisfies JobStatus[];

// Moderation actions offered for each status.
const ACTIONS: Record<JobStatus, JobStatus[]> = {
  published: ["hidden", "closed", "removed"],
  hidden: ["published", "closed", "removed"],
  closed: ["published", "removed"],
  removed: ["published"],
};

export default async function AdminJobsPage({ searchParams }: PageProps<"/admin/jobs">) {
  const query = await searchParams;
  const status = STATUSES.find((s) => s === query.status);
  const t = await getTranslations("admin");
  const tj = await getTranslations("jobStatus");
  const format = await getFormatter();
  const supabase = await createClient();
  let request = supabase
    .from("jobs")
    .select(
      "id, title, description, location_label, lat, lng, status, published_at, employer_profiles(company_name)",
    )
    .order("created_at", { ascending: false })
    .limit(300);
  if (status) request = request.eq("status", status);
  const { data: jobs } = await request;

  const filterHref = (s?: JobStatus) => (s ? `/admin/jobs?status=${s}` : "/admin/jobs");
  const actionLabel: Record<JobStatus, string> = {
    published: t("jobPublish"),
    hidden: t("jobHide"),
    closed: t("jobClose"),
    removed: t("jobRemove"),
  };

  return (
    <div>
      <PageTitle title={t("jobsTitle")} body={t("jobsBody")} />

      <nav aria-label={t("allJobStatuses")} className="mb-4 flex flex-wrap gap-2">
        {[undefined, ...STATUSES].map((s) => (
          <Link
            key={s ?? "all"}
            href={filterHref(s)}
            aria-current={s === status ? "page" : undefined}
            className={cn(
              "h-9 rounded-full px-4 text-sm leading-9 font-semibold",
              s === status ? "bg-foreground text-background" : "bg-muted hover:bg-muted/70",
            )}
          >
            {s ? tj(s) : t("allJobStatuses")}
          </Link>
        ))}
      </nav>

      {!jobs?.length ? (
        <p className="rounded-3xl border-2 border-dashed p-10 text-center text-muted-foreground">
          {t("noJobs")}
        </p>
      ) : (
        <>
          <div className="shadow-float mb-5 h-72 overflow-hidden rounded-3xl sm:h-96">
            <AdminJobsMap
              jobs={jobs.map((j) => ({ id: j.id, title: j.title, lat: j.lat, lng: j.lng }))}
            />
          </div>
          <ul className="space-y-3">
            {jobs.map((job) => (
              <li
                key={job.id}
                id={`job-${job.id}`}
                className="shadow-float scroll-mt-24 rounded-3xl bg-card p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">{job.title}</p>
                  <JobStatusBadge status={job.status} />
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {job.employer_profiles?.company_name} · {job.location_label} ·{" "}
                  {format.dateTime(new Date(job.published_at), { dateStyle: "medium" })}
                </p>
                <p className="mt-2 line-clamp-3 text-sm whitespace-pre-line">{job.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ACTIONS[job.status].map((next) => (
                    <ActionButton
                      key={next}
                      size="pill"
                      variant={next === "removed" ? "ghost" : "secondary"}
                      className={next === "removed" ? "text-destructive" : undefined}
                      confirm={next === "removed" ? t("removeConfirm") : undefined}
                      action={adminSetJobStatus.bind(null, { jobId: job.id, status: next })}
                    >
                      {actionLabel[next]}
                    </ActionButton>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
