"use client";

import type L from "leaflet";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { adminReviewJob, adminSetJobStatus } from "@/actions/admin-panel";
import type { AdminMapApi } from "@/components/admin/admin-map-canvas";
import { AdminMap } from "@/components/admin/jobs-map";
import { btn, EmptyRow, JOB_PILL, StatusPill } from "@/components/admin/wm";
import { WmIcon } from "@/components/map/wm-icons";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { displayTitle, isSample, shortLabel } from "@/lib/jobs/display";
import type { JobStatus } from "@/lib/jobs/meta";
import type { ActionResult } from "@/lib/result";
import { cn } from "@/lib/utils";

export type BoardJob = {
  id: string;
  title: string;
  description: string;
  area: string;
  city: string | null;
  lat: number;
  lng: number;
  status: JobStatus;
  date: string;
  sponsor: string;
  reviewNote: string | null;
};

// Moderation actions per status (waiting jobs get Approve / Needs changes).
const ACTIONS: Record<JobStatus, JobStatus[]> = {
  pending: ["removed"],
  rejected: ["removed"],
  published: ["hidden", "closed", "removed"],
  hidden: ["published", "closed", "removed"],
  closed: ["published", "removed"],
  removed: ["published"],
};

export function JobsBoard({ jobs }: { jobs: BoardJob[] }) {
  const t = useTranslations("adminUi");
  const router = useRouter();
  const params = useSearchParams();
  const selectedParam = params.get("job");
  const [selectedId, setSelectedId] = useState<string | null>(
    jobs.some((j) => j.id === selectedParam) ? selectedParam : (jobs[0]?.id ?? null),
  );
  const [view, setView] = useState<L.LatLngBounds | null>(null);
  const api = useRef<AdminMapApi | null>(null);

  const pins = useMemo(
    () =>
      jobs.map((j) => ({
        id: j.id,
        label: shortLabel(j.title, 22),
        lat: j.lat,
        lng: j.lng,
        pending: j.status === "pending",
      })),
    [jobs],
  );

  function select(id: string, scroll: boolean) {
    setSelectedId(id);
    const next = new URLSearchParams(params);
    next.set("job", id);
    window.history.replaceState(null, "", `?${next}`);
    if (scroll)
      document
        .getElementById(`job-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // "1 more job in Abu Dhabi": jobs outside the current view.
  const outside = view ? jobs.filter((j) => !view.contains([j.lat, j.lng])) : [];
  const outsideArea = (() => {
    const cities = new Map<string, number>();
    for (const j of outside) cities.set(j.city || j.area, (cities.get(j.city || j.area) ?? 0) + 1);
    return [...cities.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  })();

  if (!jobs.length) return <EmptyRow>{t("noJobs")}</EmptyRow>;

  return (
    <div className="flex min-h-0 flex-col gap-4 lg:flex-row">
      <section className="flex w-full shrink-0 flex-col gap-2.5 self-start rounded-3xl bg-white p-3 shadow-wm-1 lg:max-h-[calc(100dvh-260px)] lg:w-[560px] lg:overflow-y-auto">
        <ul className="flex flex-col gap-2.5">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              selected={job.id === selectedId}
              onSelect={() => select(job.id, false)}
              onDone={() => router.refresh()}
            />
          ))}
        </ul>
      </section>
      <section className="min-w-0 grow self-stretch rounded-3xl bg-white p-2 shadow-wm-1">
        <div
          role="region"
          aria-label={t("jobsMap")}
          className="relative h-[420px] w-full overflow-hidden rounded-[20px] lg:h-[calc(100dvh-276px)] lg:min-h-[480px]"
        >
          <AdminMap
            pins={pins}
            selectedId={selectedId}
            onSelect={(id) => select(id, true)}
            apiRef={api}
            onView={setView}
          />
          <div className="pointer-events-none absolute top-4 left-4 z-[500] flex flex-wrap gap-2">
            <span className="flex h-9 items-center gap-2 rounded-full bg-white px-3 text-[13px] font-bold shadow-[0_6px_16px_rgba(11,18,32,0.14)]">
              <span className="size-2.5 rounded-full bg-wm-ok" aria-hidden="true" />
              {t("legendLive")}
            </span>
            <span className="flex h-9 items-center gap-2 rounded-full bg-white px-3 text-[13px] font-bold shadow-[0_6px_16px_rgba(11,18,32,0.14)]">
              <span
                className="box-border size-2.5 rounded-full border-2 border-dashed border-[#E08A1E]"
                aria-hidden="true"
              />
              {t("legendPending")}
            </span>
          </div>
          {outside.length ? (
            <button
              type="button"
              onClick={() => api.current?.show(outside.map((j) => j.id))}
              className="absolute bottom-4 left-4 z-[500] flex h-10 items-center gap-2 rounded-full border-0 bg-wm-ink px-3.5 text-[13px] font-bold text-white shadow-[0_8px_20px_rgba(11,18,32,0.25)]"
            >
              <WmIcon name="pin" size={16} stroke={2.1} />
              {t("moreJobsIn", { count: outside.length, area: outsideArea })}
            </button>
          ) : null}
          <div className="absolute right-4 bottom-4 z-[500] flex flex-col overflow-hidden rounded-full bg-white shadow-[0_6px_16px_rgba(11,18,32,0.14)]">
            <button
              type="button"
              aria-label={t("zoomIn")}
              onClick={() => api.current?.zoomIn()}
              className="flex size-[42px] items-center justify-center border-0 bg-transparent text-wm-ink"
            >
              <WmIcon name="plus" size={16} stroke={2.4} />
            </button>
            <button
              type="button"
              aria-label={t("zoomOut")}
              onClick={() => api.current?.zoomOut()}
              className="flex size-[42px] items-center justify-center border-0 bg-transparent text-wm-ink"
            >
              <WmIcon name="minus" size={16} stroke={2.4} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function JobCard({
  job,
  selected,
  onSelect,
  onDone,
}: {
  job: BoardJob;
  selected: boolean;
  onSelect: () => void;
  onDone: () => void;
}) {
  const t = useTranslations("adminUi");
  const ta = useTranslations("admin");
  const te = useTranslations("errors");
  const ask = useConfirm();
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<ActionResult>, success?: string) =>
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) toast.error(te(result.error));
      else {
        if (success) toast.success(success);
        onDone();
      }
    });

  const label: Record<JobStatus, string> = {
    pending: "",
    rejected: "",
    published: t("putBack"),
    hidden: t("hide"),
    closed: t("close"),
    removed: t("remove"),
  };
  const icon = { published: "pin", hidden: "eyeOff", closed: "lock", removed: "trash" } as const;

  return (
    <li
      id={`job-${job.id}`}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest("button, a, textarea")) onSelect();
      }}
      className={cn(
        "flex cursor-pointer scroll-mt-4 flex-col gap-2.5 rounded-[18px] border px-[18px] py-4",
        selected
          ? "border-wm-blue bg-[#F7F9FF]"
          : "border-[#EEF0F4] bg-white hover:border-wm-tint-line",
      )}
    >
      <div className="flex flex-col gap-1">
        <button
          type="button"
          aria-pressed={selected}
          onClick={onSelect}
          className="flex flex-wrap items-center gap-2 border-0 bg-transparent p-0 text-start text-base font-extrabold tracking-[-0.2px] text-wm-ink"
        >
          {displayTitle(job.title)}
          <StatusPill tone={JOB_PILL[job.status]}>{t(`jobTabs.${job.status}`)}</StatusPill>
          {isSample(job.title) ? <StatusPill tone="sample">{t("sample")}</StatusPill> : null}
        </button>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-medium text-wm-slate">
          <span className="flex items-center gap-[5px]">
            <WmIcon name="building" size={14} stroke={2} />
            {job.sponsor}
          </span>
          <span className="flex items-center gap-[5px]">
            <WmIcon name="pin" size={14} stroke={2} />
            {job.area}
          </span>
          <span>{job.date}</span>
        </span>
      </div>
      <p className="m-0 line-clamp-3 text-sm font-medium whitespace-pre-line text-wm-body">
        {job.description}
      </p>
      {job.status === "rejected" && job.reviewNote ? (
        <p className="m-0 rounded-xl bg-[#FFF5F5] px-3 py-2 text-[13px] font-semibold text-wm-danger">
          {t("changesAsked", { reason: job.reviewNote })}
        </p>
      ) : null}
      {asking ? (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold">{t("reasonLabel")}</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={t("reasonPlaceholder")}
              className="rounded-xl border border-[#D5DAE2] bg-white px-3.5 py-2.5 text-sm"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending || !note.trim()}
              onClick={() =>
                run(
                  () => adminReviewJob({ jobId: job.id, approve: false, note }),
                  ta("jobRejectedToast"),
                )
              }
              className={btn("dark", "sm")}
            >
              {t("sendBack")}
            </button>
            <button type="button" onClick={() => setAsking(false)} className={btn("ghost", "sm")}>
              {t("cancel")}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {job.status === "pending" ? (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  run(
                    () => adminReviewJob({ jobId: job.id, approve: true, note: "" }),
                    ta("jobApprovedToast"),
                  )
                }
                className={btn("primary", "sm")}
              >
                <WmIcon name="check" size={17} stroke={2.2} />
                {t("approveForMap")}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setAsking(true)}
                className={btn("secondary", "sm")}
              >
                <WmIcon name="pencil" size={17} stroke={2.2} />
                {t("needsChanges")}
              </button>
            </>
          ) : null}
          {ACTIONS[job.status].map((next) => (
            <button
              key={next}
              type="button"
              disabled={pending}
              onClick={async () => {
                if (next === "removed") {
                  const yes = await ask({
                    title: t("remove"),
                    tone: "danger",
                    confirmLabel: t("remove"),
                  });
                  if (!yes) return;
                }
                run(() => adminSetJobStatus({ jobId: job.id, status: next }));
              }}
              className={btn(next === "removed" ? "dangerText" : "secondary", "sm")}
            >
              <WmIcon name={icon[next as keyof typeof icon]} size={17} stroke={2.2} />
              {label[next]}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}
