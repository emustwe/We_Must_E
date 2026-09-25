import { ArrowLeft, ChevronRight, Lock, MapPin, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { JobStatusBadge } from "@/components/employer/job-status-badge";
import { JobStatusControls } from "@/components/employer/job-status-controls";
import { FormAlert } from "@/components/forms/form-alert";
import { buttonVariants } from "@/components/ui/button";
import { getOwnJob } from "@/lib/jobs/employer-queries";
import { createClient } from "@/lib/supabase/server";
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
  const notice =
    query.posted === "1"
      ? t("posted")
      : query.review === "1"
        ? t("sentForReview")
        : query.saved === "1"
          ? t("saved")
          : null;
  const editable = ["pending", "published", "closed", "rejected"].includes(job.status);
  const page =
    typeof query.page === "string" && /^\d{1,4}$/.test(query.page) ? Number(query.page) : 0;

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
      {job.status === "pending" && query.posted !== "1" && query.review !== "1" ? (
        <p className="rounded-2xl bg-brand-accent/15 px-4 py-3 text-sm font-medium">
          {t("pendingNotice")}
        </p>
      ) : null}
      {job.status === "rejected" ? (
        <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm" role="status">
          <p className="font-semibold text-destructive">{t("rejectedNotice")}</p>
          {job.review_note ? (
            <p className="mt-1">{t("rejectedReason", { reason: job.review_note })}</p>
          ) : null}
          <p className="mt-1 text-muted-foreground">{t("rejectedHint")}</p>
        </div>
      ) : null}

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

      <Candidates jobId={job.id} page={page} />
    </div>
  );
}

async function Candidates({ jobId, page }: { jobId: string; page: number }) {
  const t = await getTranslations("employerJob");
  const format = await getFormatter();
  const supabase = await createClient();
  // Only admin-approved applications for this sponsor's own job.
  const { data: rows } = await supabase.rpc("sponsor_list_candidates", {
    p_job_id: jobId,
    p_page: page,
  });
  const total = Number(rows?.[0]?.total ?? 0);
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xl font-extrabold">{t("applicantsTitle")}</h2>
        {total ? (
          <p className="text-sm text-muted-foreground">{t("candidatesCount", { count: total })}</p>
        ) : null}
      </div>
      {!rows?.length ? (
        <p className="rounded-[2rem] border-2 border-dashed p-6 text-center text-sm text-muted-foreground">
          {t("noApplicants")}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((c) => (
            <li key={c.application_id}>
              <Link
                href={`/sponsor/jobs/${jobId}/candidates/${c.application_id}`}
                className="shadow-float flex items-center gap-3 rounded-3xl bg-card p-4 transition-colors hover:bg-muted/40"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                  {c.full_name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{c.full_name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {t("approvedOn", {
                      date: format.dateTime(new Date(c.reviewed_at), {
                        day: "numeric",
                        month: "short",
                      }),
                    })}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-sm font-semibold">
                  {c.test_percent === null
                    ? t("noScore")
                    : t("score", { score: Number(c.test_percent) })}
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
      {total > 20 ? (
        <nav className="flex justify-center gap-2" aria-label={t("applicantsTitle")}>
          {page > 0 ? (
            <Link
              href={`/sponsor/jobs/${jobId}?page=${page - 1}`}
              className={buttonVariants({ size: "pill", variant: "secondary" })}
            >
              {t("prev")}
            </Link>
          ) : null}
          {(page + 1) * 20 < total ? (
            <Link
              href={`/sponsor/jobs/${jobId}?page=${page + 1}`}
              className={buttonVariants({ size: "pill", variant: "secondary" })}
            >
              {t("next")}
            </Link>
          ) : null}
        </nav>
      ) : null}
    </section>
  );
}
