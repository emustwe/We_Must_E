"use client";

import { useTranslations } from "next-intl";
import {
  CATEGORY_META,
  formatPayAmount,
  type ApplicationStatus,
  type Availability,
  type JobCategory,
  type PayPeriod,
} from "@/lib/jobs/meta";
import { cn } from "@/lib/utils";

export type JobSummary = {
  id: string;
  title: string;
  category: JobCategory;
  schedule: Availability[];
  payMin: number;
  payMax: number | null;
  payPeriod: PayPeriod;
  currency: string;
  area: string;
  city: string;
  companyName: string;
  lat: number;
  lng: number;
  requestStatus: ApplicationStatus | null;
};

export function PayLabel({
  min,
  max,
  period,
  currency,
  className,
}: {
  min: number;
  max: number | null;
  period: PayPeriod;
  currency: string;
  className?: string;
}) {
  const t = useTranslations("payPeriod");
  return (
    <span className={className}>
      {formatPayAmount(min, max, currency)}
      <span className="font-medium text-muted-foreground"> {t(period)}</span>
    </span>
  );
}

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const t = useTranslations("requestStatus");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        status === "accepted" && "bg-success/15 text-success",
        status === "pending" && "bg-primary/10 text-primary",
        (status === "declined" || status === "withdrawn") && "bg-muted text-muted-foreground",
      )}
    >
      {t(status)}
    </span>
  );
}

export function JobCard({
  job,
  selected,
  onSelect,
  className,
}: {
  job: JobSummary;
  selected?: boolean;
  onSelect: (id: string) => void;
  className?: string;
}) {
  const ts = useTranslations("schedule");
  const meta = CATEGORY_META[job.category];
  return (
    <button
      type="button"
      onClick={() => onSelect(job.id)}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-start gap-3 rounded-3xl border-2 bg-background p-3.5 text-start transition-[border-color,transform] duration-150 active:scale-[0.99]",
        selected ? "border-foreground" : "shadow-float border-transparent",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-2xl text-2xl",
          meta.tint,
        )}
        aria-hidden="true"
      >
        {meta.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="line-clamp-1 font-bold">{job.title}</span>
          {job.requestStatus ? <StatusBadge status={job.requestStatus} /> : null}
        </span>
        <span className="mt-0.5 block truncate text-sm text-muted-foreground">
          {job.companyName} · {job.area}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <PayLabel
            min={job.payMin}
            max={job.payMax}
            period={job.payPeriod}
            currency={job.currency}
            className="font-bold"
          />
          <span className="text-muted-foreground" aria-hidden="true">
            ·
          </span>
          <span className="text-muted-foreground">{job.schedule.map((s) => ts(s)).join(", ")}</span>
        </span>
      </span>
    </button>
  );
}
