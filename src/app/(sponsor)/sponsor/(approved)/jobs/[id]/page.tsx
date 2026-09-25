import { ArrowLeft, Lock, MapPin, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { JobStatusBadge } from "@/components/employer/job-status-badge";
import { JobStatusControls } from "@/components/employer/job-status-controls";
import { FormAlert } from "@/components/forms/form-alert";
import { buttonVariants } from "@/components/ui/button";
import { getOwnJob } from "@/lib/jobs/employer-queries";
import { idSchema } from "@/lib/validations/jobs";

export const metadata: Metadata = { title: "Job" };

export default async function EmployerJobPage({
  params,
  searchParams,
}: PageProps<"/sponsor/jobs/[id]">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const query = await searchParams;
  const job = await getOwnJob(id);
  if (job.status === "removed") notFound();
  const t = await getTranslations("employerJob");
  const notice = query.posted === "1" ? t("posted") : query.saved === "1" ? t("saved") : null;
  const editable = job.status === "published" || job.status === "closed";

  return (
    <div className="animate-in-fast space-y-6 pt-2">
      <Link
        href="/sponsor"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        {t("back")}
      </Link>
      {notice ? <FormAlert tone="success" message={notice} /> : null}
      {job.status === "hidden" ? <FormAlert message={t("hiddenNotice")} /> : null}

      <section className="shadow-float rounded-[2rem] bg-card p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-extrabold tracking-tight">{job.title}</h1>
          <JobStatusBadge status={job.status} />
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-2xl bg-muted/70 p-3 text-sm">
          <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="font-semibold">{job.location_label}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="size-3" aria-hidden="true" />
              {t("privateLocation")}
            </p>
          </div>
        </div>
        <p className="mt-4 leading-relaxed whitespace-pre-line">{job.description}</p>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <JobStatusControls jobId={job.id} status={job.status} />
          {editable ? (
            <Link
              href={`/sponsor/jobs/${job.id}/edit`}
              className={buttonVariants({ variant: "outline", size: "pill" })}
            >
              <Pencil className="size-4" aria-hidden="true" />
              {t("edit")}
            </Link>
          ) : null}
        </div>
      </section>

      <section className="rounded-[2rem] border-2 border-dashed p-6 text-center">
        <h2 className="font-extrabold">{t("applicantsTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("noApplicants")}</p>
      </section>
    </div>
  );
}
