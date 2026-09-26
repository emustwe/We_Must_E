"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { WmIcon, type IconName } from "@/components/map/wm-icons";
import { SponsorLogo } from "@/components/sponsors/sponsor-logo";
import { daysSince, displayTitle, isNewJob, isSample } from "@/lib/jobs/display";
import type { PublicJob } from "@/lib/jobs/public-job";
import { cn } from "@/lib/utils";

export type CardJob = { job: PublicJob; km: number | null };
export type Pager = { index: number; total: number; prev: () => void; next: () => void };

type CardProps = {
  item: CardJob;
  pager: Pager | null;
  saved: boolean;
  onToggleSave: () => void;
  onShare: () => void;
  onClose: () => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
};

// 38px white circle buttons on the colour band (Save, Share, Close).
function BandButton({
  label,
  icon,
  onClick,
  pressed,
  size = 17,
}: {
  label: string;
  icon: IconName;
  onClick: () => void;
  pressed?: boolean;
  size?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      className={cn(
        "flex size-[38px] items-center justify-center rounded-full bg-white shadow-wm-1",
        pressed ? "text-wm-blue" : "text-wm-ink",
      )}
    >
      <WmIcon
        name={icon}
        size={size}
        stroke={icon === "close" && size === 16 ? 2.4 : 2.2}
        fill={pressed ? "currentColor" : "none"}
      />
    </button>
  );
}

function Badges({ job }: { job: PublicJob }) {
  const t = useTranslations("explore");
  const fresh = isNewJob(job.publishedAt);
  const sample = isSample(job.title);
  if (job.isExample) {
    return (
      <span className="flex h-6 items-center rounded-full bg-white/85 px-2.5 text-xs font-bold text-wm-sample">
        {t("exampleBadge")}
      </span>
    );
  }
  if (!fresh && !sample) return null;
  return (
    <>
      {fresh ? (
        <span className="flex h-6 items-center rounded-full bg-wm-new px-2.5 text-xs font-extrabold text-white">
          {t("newBadge")}
        </span>
      ) : null}
      {sample ? (
        <span className="flex h-6 items-center rounded-full bg-white/85 px-2.5 text-xs font-bold text-wm-sample">
          {t("sampleBadge")}
        </span>
      ) : null}
    </>
  );
}

function usePosted(job: PublicJob) {
  const t = useTranslations("explore");
  return t("postedAgo", { days: daysSince(job.publishedAt) });
}

function areaOf(job: PublicJob) {
  return job.locationLabel.split(",")[0]?.trim() || job.city || job.locationLabel;
}

function kmText(km: number) {
  return km < 10 ? km.toFixed(1) : String(Math.round(km));
}

function PagerRow({ pager }: { pager: Pager }) {
  const t = useTranslations("explore");
  return (
    <div className="flex items-center justify-between rounded-2xl bg-wm-mist py-1.5 ps-3.5 pe-1.5">
      <span className="text-[13px] font-bold text-wm-body">
        {t("atSpot", { current: pager.index + 1, total: pager.total })}
      </span>
      <span className="flex gap-1.5">
        {(
          [
            ["chevronLeft", t("prevAtSpot"), pager.prev],
            ["chevronRight", t("nextAtSpot"), pager.next],
          ] as const
        ).map(([icon, label, fn]) => (
          <button
            key={icon}
            type="button"
            onClick={fn}
            aria-label={label}
            className="flex size-9 items-center justify-center rounded-xl bg-white text-wm-ink shadow-wm-1"
          >
            <WmIcon name={icon} size={15} stroke={2.6} />
          </button>
        ))}
      </span>
    </div>
  );
}

function HowApplying() {
  const t = useTranslations("explore");
  const steps: [IconName, string][] = [
    ["bolt", t("stepTest")],
    ["video", t("stepVideo")],
    ["list", t("stepQuestions")],
  ];
  return (
    <div className="flex flex-col gap-3.5 rounded-[20px] border border-wm-line px-3.5 pt-4 pb-3.5">
      <span className="flex items-baseline justify-between">
        <span className="text-sm font-extrabold">{t("howApplying")}</span>
        <span className="text-xs font-semibold text-wm-caption">{t("shortSteps")}</span>
      </span>
      <ol className="relative grid grid-cols-3 gap-1">
        <span
          className="absolute top-5 right-[16.6%] left-[16.6%] h-0.5 bg-wm-tint-line"
          aria-hidden="true"
        />
        {steps.map(([icon, label], i) => (
          <li key={label} className="relative z-[1] flex flex-col items-center gap-2">
            <span
              className={cn(
                "flex size-10 items-center justify-center rounded-full border-[3px] border-white",
                i === 0
                  ? "bg-wm-blue text-white shadow-[0_0_0_1px_#2457F5]"
                  : "bg-wm-tint text-wm-blue shadow-[0_0_0_1px_#D6E0FB]",
              )}
            >
              <WmIcon name={icon} size={17} stroke={2.2} />
            </span>
            <span className="text-center text-xs font-bold text-wm-ink">{label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// Example jobs: what a job looks like, with no way to apply.
function ExampleNotice() {
  const t = useTranslations("explore");
  return (
    <div className="flex items-start gap-3 rounded-[18px] border border-wm-line bg-wm-land p-4">
      <span className="shrink-0 text-wm-caption">
        <WmIcon name="info" size={18} stroke={2.2} />
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-sm font-extrabold text-wm-ink">{t("exampleTitle")}</span>
        <span className="text-[13px] leading-[1.5] font-medium text-wm-body">
          {t("exampleBody")}
        </span>
      </span>
    </div>
  );
}

function ApplyFooter({ jobId, mobile }: { jobId: string; mobile?: boolean }) {
  const t = useTranslations("explore");
  return (
    <>
      <Link
        href={`/apply/${jobId}`}
        className={cn(
          "flex w-full items-center justify-center rounded-[18px] bg-wm-blue text-base font-extrabold tracking-[-0.1px] text-white hover:bg-wm-blue-pressed",
          mobile ? "h-[54px] shadow-[0_10px_24px_rgba(36,87,245,0.35)]" : "h-14 shadow-wm-blue",
        )}
      >
        {t("applyForJob")}
      </Link>
      <span className="flex items-center justify-center gap-[7px] text-xs font-semibold text-wm-trust">
        <WmIcon name="shieldCheck" size={15} stroke={2.2} />
        {t("trustLine")}
      </span>
    </>
  );
}

// Desktop: a 392px floating card beside the pin (reference/desktop-map.html).
export function JobCard({
  item,
  pager,
  saved,
  onToggleSave,
  onShare,
  onClose,
  headingRef,
  style,
}: CardProps & { style: CSSProperties }) {
  const t = useTranslations("explore");
  const { job, km } = item;
  const posted = usePosted(job);
  return (
    <article
      aria-labelledby="wm-job-title"
      style={style}
      className="wm-pop absolute z-[1001] flex w-[392px] flex-col overflow-hidden rounded-[28px] bg-white shadow-wm-3"
    >
      <div className="relative h-[108px] shrink-0 overflow-hidden bg-[#DCE6FF]">
        <span className="absolute -top-2 -right-3.5 flex text-wm-blue opacity-[0.16]">
          <WmIcon name="briefcase" size={132} stroke={1.3} />
        </span>
        <span className="absolute top-[18px] left-5 flex gap-1.5">
          <Badges job={job} />
        </span>
        <span className="absolute top-3.5 right-4 flex gap-2">
          <BandButton
            label={saved ? t("unsaveJob") : t("saveJob")}
            icon="bookmark"
            pressed={saved}
            onClick={onToggleSave}
          />
          <BandButton label={t("shareJob")} icon="share" onClick={onShare} />
          <BandButton label={t("closeJob")} icon="close" onClick={onClose} />
        </span>
      </div>
      <div className="relative -mt-[30px] flex items-end gap-3 px-[22px]">
        <SponsorLogo
          name={job.sponsorName}
          path={job.sponsorLogo}
          className="size-[60px] rounded-[18px] border border-wm-line bg-white text-lg font-extrabold text-wm-blue shadow-wm-1"
        />
        <span className="flex min-w-0 flex-col gap-px pb-1">
          <span className="truncate text-sm font-bold text-wm-ink">{job.sponsorName}</span>
          <span className="text-xs font-medium text-wm-caption">{posted}</span>
        </span>
      </div>
      <div className="flex min-h-0 grow flex-col gap-[18px] overflow-y-auto px-[22px] pt-4 pb-1">
        {pager ? <PagerRow pager={pager} /> : null}
        <h2
          id="wm-job-title"
          ref={headingRef}
          tabIndex={-1}
          className="m-0 text-[27px] leading-[1.15] font-extrabold tracking-[-0.7px] break-words text-wm-ink outline-none"
        >
          {displayTitle(job.title)}
        </h2>
        <div className="grid grid-cols-2 gap-x-3 gap-y-3.5">
          <Fact icon="pin" label={t("area")} value={areaOf(job)} />
          {km !== null ? (
            <Fact icon="route" label={t("distanceFact")} value={t("fromYou", { km: kmText(km) })} />
          ) : null}
        </div>
        <p className="m-0 text-[15px] leading-[1.6] font-medium whitespace-pre-line text-wm-body">
          {job.description}
        </p>
        {job.isExample ? null : <HowApplying />}
      </div>
      <div className="flex flex-col gap-3 border-t border-[#EEF0F4] bg-white px-[22px] pt-4 pb-5">
        {job.isExample ? <ExampleNotice /> : <ApplyFooter jobId={job.id} />}
      </div>
    </article>
  );
}

function Fact({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-wm-mist text-wm-blue">
        <WmIcon name={icon} size={17} stroke={2.1} />
      </span>
      <span className="flex min-w-0 flex-col gap-px">
        <span className="text-xs font-medium text-wm-caption">{label}</span>
        <span className="truncate text-sm font-bold text-wm-ink">{value}</span>
      </span>
    </div>
  );
}

function FactTile({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-[14px] bg-wm-mist p-2.5">
      <span className="flex text-wm-blue">
        <WmIcon name={icon} size={16} stroke={2.1} />
      </span>
      <span className="text-[11px] font-medium text-wm-caption">{label}</span>
      <span className="truncate text-[13px] font-bold">{value}</span>
    </div>
  );
}

// Mobile: a bottom sheet with a grab handle and 3 heights (peek, half, full).
const PEEK = 232;
type Snap = "peek" | "half" | "full";

export function JobSheet({
  item,
  pager,
  saved,
  onToggleSave,
  onClose,
  headingRef,
}: Omit<CardProps, "onShare">) {
  const t = useTranslations("explore");
  const { job, km } = item;
  const posted = usePosted(job);
  const [snap, setSnap] = useState<Snap>("half");
  const [drag, setDrag] = useState<number | null>(null);
  const start = useRef<{ y: number; h: number } | null>(null);
  const sheet = useRef<HTMLElement>(null);

  // A new job opens at half height.
  useEffect(() => {
    const id = window.setTimeout(() => setSnap("half"), 0);
    return () => window.clearTimeout(id);
  }, [job.id]);

  const heightFor = (s: Snap) => {
    const vh = window.innerHeight;
    return s === "peek"
      ? PEEK
      : s === "half"
        ? Math.max(414, Math.round(vh * 0.5))
        : Math.round(vh * 0.92);
  };

  function onDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("button")) return;
    start.current = { y: e.clientY, h: sheet.current?.offsetHeight ?? heightFor(snap) };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onMove(e: React.PointerEvent) {
    if (!start.current) return;
    const h = start.current.h + (start.current.y - e.clientY);
    setDrag(Math.max(120, Math.min(h, window.innerHeight * 0.92)));
  }
  function onUp() {
    if (!start.current) return;
    const h = drag ?? start.current.h;
    start.current = null;
    setDrag(null);
    if (h < PEEK - 60) return onClose();
    const options: Snap[] = ["peek", "half", "full"];
    setSnap(
      options.reduce((a, b) => (Math.abs(heightFor(b) - h) < Math.abs(heightFor(a) - h) ? b : a)),
    );
  }

  const style: CSSProperties =
    drag !== null
      ? { height: drag }
      : snap === "peek"
        ? { height: PEEK }
        : snap === "full"
          ? { height: "92dvh" }
          : { maxHeight: "max(414px, 50dvh)" };

  return (
    <section
      ref={sheet}
      aria-labelledby="wm-job-title"
      style={style}
      className="animate-sheet absolute inset-x-0 bottom-0 z-[1001] flex flex-col overflow-hidden rounded-t-[30px] bg-white shadow-[0_-12px_40px_rgba(11,18,32,0.18)] transition-[height] duration-200"
    >
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="relative h-[84px] shrink-0 touch-none overflow-hidden bg-[#DCE6FF]"
      >
        <button
          type="button"
          aria-label={snap === "full" ? t("closeJob") : t("jobDetails")}
          onClick={() => setSnap(snap === "full" ? "half" : "full")}
          className="absolute top-0 left-1/2 flex h-5 w-16 -translate-x-1/2 items-start justify-center pt-2"
        >
          <span className="h-[5px] w-10 rounded-full bg-[rgba(11,18,32,0.18)]" />
        </button>
        <span className="absolute -top-2.5 -right-2.5 flex text-wm-blue opacity-[0.16]">
          <WmIcon name="briefcase" size={110} stroke={1.3} />
        </span>
        <span className="absolute top-6 left-5 flex gap-1.5">
          <Badges job={job} />
        </span>
        <span className="absolute top-5 right-4 flex gap-2">
          <BandButton
            label={saved ? t("unsaveJob") : t("saveJob")}
            icon="bookmark"
            pressed={saved}
            onClick={onToggleSave}
            size={16}
          />
          <BandButton label={t("closeJob")} icon="close" onClick={onClose} size={16} />
        </span>
      </div>
      <div className="relative -mt-[26px] flex shrink-0 items-end gap-3 px-5">
        <SponsorLogo
          name={job.sponsorName}
          path={job.sponsorLogo}
          className="size-[54px] rounded-2xl border border-wm-line bg-white text-base font-extrabold text-wm-blue shadow-wm-1"
        />
        <span className="flex min-w-0 flex-col gap-px pb-[3px]">
          <span className="truncate text-sm font-bold">{job.sponsorName}</span>
          <span className="text-xs font-medium text-wm-caption">{posted}</span>
        </span>
      </div>
      <div className="flex min-h-0 grow flex-col gap-3.5 overflow-y-auto px-5 pt-3">
        {pager ? <PagerRow pager={pager} /> : null}
        <h2
          id="wm-job-title"
          ref={headingRef}
          tabIndex={-1}
          className="m-0 text-2xl leading-[1.15] font-extrabold tracking-[-0.6px] break-words outline-none"
        >
          {displayTitle(job.title)}
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <FactTile icon="pin" label={t("area")} value={areaOf(job)} />
          {km !== null ? (
            <FactTile
              icon="route"
              label={t("distanceFact")}
              value={t("kmShort", { km: kmText(km) })}
            />
          ) : null}
        </div>
        <p className="m-0 text-sm leading-[1.55] font-medium whitespace-pre-line text-wm-body">
          {job.description}
        </p>
      </div>
      <div className="flex shrink-0 flex-col gap-2.5 px-5 pt-4 pb-[max(22px,env(safe-area-inset-bottom))]">
        {job.isExample ? <ExampleNotice /> : <ApplyFooter jobId={job.id} mobile />}
      </div>
    </section>
  );
}
