import { ArrowLeft, Lock, MapPin, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ApplicantList } from "@/components/employer/applicant-list";
import { JobStatusControls } from "@/components/employer/job-status-controls";
import { PayLabelServer } from "@/components/employer/pay-label-server";
import { FormAlert } from "@/components/forms/form-alert";
import { buttonVariants } from "@/components/ui/button";
import { getOwnJob, listApplicants } from "@/lib/jobs/employer-queries";
import { CATEGORY_META } from "@/lib/jobs/meta";
import { cn } from "@/lib/utils";
import { idSchema } from "@/lib/validations/jobs";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Job" };

export default async function EmployerJobPage({
  params,
  searchParams,
}: PageProps<"/employer/jobs/[id]">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const query = await searchParams;
  const [job, applicants] = await Promise.all([getOwnJob(id), listApplicants(id)]);
  const t = await getTranslations("employerJob");
  const tj = await getTranslations("jobStatus");
  const ts = await getTranslations("schedule");
  const meta = CATEGORY_META[job.category];
  const notice = query.posted === "1" ? t("posted") : query.saved === "1" ? t("saved") : null;

  return (
    <div className="animate-in-fast space-y-6 pt-2">
      <Link
        href="/employer"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        {t("back")}
      </Link>
      {notice ? <FormAlert tone="success" message={notice} /> : null}

      <section className="shadow-float rounded-[2rem] bg-card p-5 sm:p-7">
        <div className="flex items-start gap-4">
          <span
            className={cn(
              "flex size-14 shrink-0 items-center justify-center rounded-2xl text-3xl",
              meta.tint,
            )}
            aria-hidden="true"
          >
            {meta.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight">{job.title}</h1>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  job.status === "open"
                    ? "bg-success/15 text-success"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {tj(job.status)}
              </span>
            </div>
            <PayLabelServer
              min={job.pay_min}
              max={job.pay_max}
              period={job.pay_period}
              currency={job.currency}
              className="mt-1 block font-bold"
            />
            <p className="mt-1 text-sm text-muted-foreground">
              {job.schedule.map((s) => ts(s)).join(", ")}
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-2xl bg-muted/70 p-3 text-sm">
          <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="font-semibold">
              {job.address || job.area_label}, {job.city_emirate}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="size-3" aria-hidden="true" />
              {t("privateLocation")}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <JobStatusControls jobId={job.id} status={job.status} />
          {job.status !== "removed" ? (
            <Link
              href={`/employer/jobs/${job.id}/edit`}
              className={buttonVariants({ variant: "outline", size: "pill" })}
            >
              <Pencil className="size-4" aria-hidden="true" />
              {t("edit")}
            </Link>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold tracking-tight">
          {t("applicantsTitle")}{" "}
          <span className="text-muted-foreground">({applicants.length})</span>
        </h2>
        <ApplicantList applicants={applicants} />
      </section>
    </div>
  );
}
