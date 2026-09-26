import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { btn, JOB_PILL, StatusPill, tileColors } from "@/components/admin/wm";
import { JobStatusControls } from "@/components/employer/job-status-controls";
import { FormAlert } from "@/components/forms/form-alert";
import { WmIcon } from "@/components/map/wm-icons";
import { CandidateRow } from "@/components/sponsors/candidate-row";
import { JobLocation } from "@/components/sponsors/job-location";
import { Crumbs } from "@/components/sponsors/sponsor-shell";
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
  const ts = await getTranslations("jobStatus");
  const tu = await getTranslations("sponsorUi");
  const format = await getFormatter();
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
  const [bg, fg] = tileColors(job.title);

  return (
    <>
      <Crumbs items={[{ label: t("back"), href: "/sponsor" }, { label: job.title }]} />
      {notice ? <FormAlert tone="success" message={notice} /> : null}
      {job.status === "hidden" ? <FormAlert message={t("hiddenNotice")} /> : null}
      {job.status === "pending" && query.posted !== "1" && query.review !== "1" ? (
        <p className="m-0 rounded-2xl border border-[#F6DFAE] bg-[#FEF6E4] px-4 py-3 text-sm font-semibold text-[#7A4B06]">
          {t("pendingNotice")}
        </p>
      ) : null}
      {job.status === "rejected" ? (
        <div
          className="rounded-2xl border border-wm-danger-line bg-[#FFF5F5] px-4 py-3 text-sm"
          role="status"
        >
          <p className="m-0 font-bold text-wm-danger">{t("rejectedNotice")}</p>
          {job.review_note ? (
            <p className="m-0 mt-1 font-medium">
              {t("rejectedReason", { reason: job.review_note })}
            </p>
          ) : null}
          <p className="m-0 mt-1 font-medium text-wm-slate">{t("rejectedHint")}</p>
        </div>
      ) : null}

      <div className="flex min-h-0 grow flex-col gap-4 xl:flex-row">
        <section className="flex min-w-0 grow flex-col gap-[22px] rounded-3xl bg-white p-6 shadow-wm-1">
          <div className="flex flex-wrap items-start gap-4">
            <span
              style={{ background: bg, color: fg }}
              className="flex size-14 shrink-0 items-center justify-center rounded-[18px]"
            >
              <WmIcon name="briefcase" size={25} stroke={2} />
            </span>
            <div className="flex min-w-0 grow basis-60 flex-col gap-1.5">
              <span className="flex flex-wrap items-center gap-2.5">
                <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.8px] break-words">
                  {job.title}
                </h1>
                <StatusPill tone={JOB_PILL[job.status]}>{ts(job.status)}</StatusPill>
              </span>
              <span className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[13px] font-medium text-wm-slate">
                <span className="flex items-center gap-[5px]">
                  <WmIcon name="pin" size={14} stroke={2} />
                  {job.location_label}
                </span>
                <span className="flex items-center gap-[5px]">
                  <WmIcon name="shieldClock" size={14} stroke={2} />
                  {tu("postedOn", {
                    date: format.dateTime(new Date(job.published_at ?? job.created_at), {
                      dateStyle: "medium",
                    }),
                  })}
                </span>
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <JobStatusControls jobId={job.id} status={job.status} />
              {editable ? (
                <Link href={`/sponsor/jobs/${job.id}/edit`} className={btn("secondary")}>
                  <WmIcon name="pencil" size={17} stroke={2.2} />
                  {tu("editJob")}
                </Link>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-extrabold">{tu("description")}</span>
            <p className="m-0 text-[15px] leading-[1.6] font-medium whitespace-pre-line text-wm-body">
              {job.description}
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            <span className="text-sm font-extrabold">{tu("location")}</span>
            <div className="relative h-[230px] w-full overflow-hidden rounded-[18px]">
              <JobLocation lat={job.lat} lng={job.lng} />
              <span className="pointer-events-none absolute bottom-3 left-3 z-[500] flex flex-wrap gap-1.5">
                <span className="flex h-[30px] items-center gap-1.5 rounded-full bg-white px-2.5 text-xs font-bold shadow-wm-1">
                  <span className="size-[9px] rounded-full bg-wm-blue" aria-hidden="true" />
                  {tu("exactPoint")}
                </span>
                <span className="flex h-[30px] items-center gap-1.5 rounded-full bg-white px-2.5 text-xs font-bold shadow-wm-1">
                  <span
                    className="box-border size-2.5 rounded-full border-[1.5px] border-dashed border-wm-blue"
                    aria-hidden="true"
                  />
                  {tu("publicArea")}
                </span>
              </span>
            </div>
            <span className="flex items-center gap-2 text-[13px] font-medium text-wm-slate">
              <span className="shrink-0 text-wm-trust">
                <WmIcon name="lock" size={15} stroke={2.2} />
              </span>
              {t("privateLocation")}
            </span>
          </div>
        </section>
        <Candidates jobId={job.id} page={page} />
      </div>
    </>
  );
}

async function Candidates({ jobId, page }: { jobId: string; page: number }) {
  const t = await getTranslations("employerJob");
  const tu = await getTranslations("sponsorUi");
  const supabase = await createClient();
  // Only admin-approved applications for this sponsor's own job.
  const { data: rows } = await supabase.rpc("sponsor_list_candidates", {
    p_job_id: jobId,
    p_page: page,
  });
  const total = Number(rows?.[0]?.total ?? 0);
  return (
    <section className="box-border flex w-full shrink-0 flex-col gap-3.5 self-start rounded-3xl bg-white p-6 shadow-wm-1 xl:w-[440px]">
      <div className="flex items-center justify-between">
        <h2 className="m-0 text-lg font-extrabold tracking-[-0.3px]">{t("applicantsTitle")}</h2>
        <span className="rounded-full bg-wm-tint px-2.5 py-[3px] text-xs font-extrabold text-wm-blue">
          {t("candidatesCount", { count: total })}
        </span>
      </div>
      <span className="text-[13px] leading-[1.5] font-medium text-wm-slate">
        {tu("candidatesBody")}
      </span>
      {!rows?.length ? (
        <p className="m-0 rounded-[18px] border-[1.5px] border-dashed border-[#C9D1DD] p-5 text-center text-sm font-medium text-wm-caption">
          {t("noApplicants")}
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {rows.map((c) => (
            <li key={c.application_id}>
              <CandidateRow
                jobId={jobId}
                applicationId={c.application_id}
                name={c.full_name}
                sharedAt={c.reviewed_at}
                unlocked={c.unlocked}
              />
            </li>
          ))}
        </ul>
      )}
      {total > 20 ? (
        <nav className="flex justify-center gap-2" aria-label={t("applicantsTitle")}>
          {page > 0 ? (
            <Link
              href={`/sponsor/jobs/${jobId}?page=${page - 1}`}
              className={btn("secondary", "sm")}
            >
              {t("prev")}
            </Link>
          ) : null}
          {(page + 1) * 20 < total ? (
            <Link
              href={`/sponsor/jobs/${jobId}?page=${page + 1}`}
              className={btn("secondary", "sm")}
            >
              {t("next")}
            </Link>
          ) : null}
        </nav>
      ) : null}
      <div className="flex items-center gap-2.5 rounded-2xl bg-wm-land p-3.5 text-xs font-semibold text-wm-slate">
        <span className="shrink-0 text-wm-trust">
          <WmIcon name="shieldCheck" size={16} stroke={2.2} />
        </span>
        {tu("viewsRecorded")} {tu("retentionNote")}
      </div>
    </section>
  );
}
