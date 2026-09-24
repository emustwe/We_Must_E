"use client";

import { CalendarDays, Loader2, Lock, MapPin, Navigation, Users, X } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { requestJob, withdrawJobRequest, type JobDetail } from "@/actions/jobs";
import { PayLabel, StatusBadge } from "@/components/jobs/job-card";
import { FormAlert } from "@/components/forms/form-alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { CATEGORY_META } from "@/lib/jobs/meta";
import { cn } from "@/lib/utils";

export function JobSheet({
  job,
  loading,
  profileReady,
  onClose,
  onChanged,
}: {
  job: JobDetail | null;
  loading: boolean;
  profileReady: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const t = useTranslations("job");
  const tc = useTranslations("categories");
  const ts = useTranslations("schedule");
  const te = useTranslations("errors");
  const format = useFormatter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send() {
    if (!job) return;
    setError(null);
    startTransition(async () => {
      const result = await requestJob({ jobId: job.id, message: message.trim() || undefined });
      if (!result.ok) return setError(te(result.error));
      toast.success(t("sentToast"));
      setMessage("");
      onChanged();
    });
  }

  function withdraw() {
    if (!job?.requestId) return;
    setError(null);
    startTransition(async () => {
      const result = await withdrawJobRequest(job.requestId);
      if (!result.ok) return setError(te(result.error));
      toast.success(t("withdrawnToast"));
      onChanged();
    });
  }

  const meta = job ? CATEGORY_META[job.category] : null;
  const canRequest = job && (!job.requestStatus || job.requestStatus === "withdrawn");

  // Portalled to <body> so it sits above the tab bar (the map layer is a
  // fixed-position stacking context).
  return createPortal(
    <div
      role="dialog"
      aria-modal="false"
      aria-label={job?.title ?? t("about")}
      className="animate-sheet shadow-float fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-[2rem] bg-background lg:inset-y-4 lg:start-auto lg:end-4 lg:max-h-none lg:w-[420px] lg:rounded-[2rem]"
    >
      <div className="flex items-center justify-between px-5 pt-3">
        <div className="mx-auto h-1.5 w-10 rounded-full bg-border lg:hidden" aria-hidden="true" />
      </div>
      <Button
        variant="secondary"
        size="icon-touch"
        onClick={onClose}
        aria-label={t("close")}
        className="absolute end-4 top-4"
      >
        <X className="size-5" />
      </Button>

      <div className="flex-1 overflow-y-auto px-5 pt-2 pb-6">
        {loading || !job || !meta ? (
          <div className="flex h-60 items-center justify-center">
            <Loader2
              className="size-6 animate-spin text-muted-foreground"
              aria-label={t("about")}
            />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="pe-12">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
                  meta.tint,
                )}
              >
                <span aria-hidden="true">{meta.emoji}</span>
                {tc(job.category)}
              </span>
              <h2 className="mt-3 text-2xl leading-tight font-extrabold tracking-tight">
                {job.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("by", { company: job.companyName })}
              </p>
            </div>

            <div className="flex items-center justify-between rounded-3xl bg-muted/70 p-4">
              <PayLabel
                min={job.payMin}
                max={job.payMax}
                period={job.payPeriod}
                currency={job.currency}
                className="text-xl font-extrabold"
              />
              {job.requestStatus ? <StatusBadge status={job.requestStatus} /> : null}
            </div>

            <div className="flex flex-wrap gap-2 text-sm">
              {job.schedule.map((s) => (
                <span key={s} className="rounded-full border px-3 py-1 font-medium">
                  {ts(s)}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium">
                <Users className="size-3.5" aria-hidden="true" />
                {t("spots", { count: job.spots })}
              </span>
              {job.startsOn ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium">
                  <CalendarDays className="size-3.5" aria-hidden="true" />
                  {t("startsOn", {
                    date: format.dateTime(new Date(job.startsOn), {
                      day: "numeric",
                      month: "short",
                    }),
                  })}
                </span>
              ) : null}
            </div>

            {job.exactAddress || job.exactLat ? (
              <div className="rounded-3xl border-2 border-success/40 bg-success/5 p-4">
                <p className="text-xs font-bold tracking-wide text-success uppercase">
                  {t("exactAddress")}
                </p>
                <p className="mt-1 font-semibold">
                  {job.exactAddress ?? `${job.area}, ${job.city}`}
                </p>
                {job.exactLat && job.exactLng ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${job.exactLat},${job.exactLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ variant: "outline", size: "pill" }), "mt-3")}
                  >
                    <Navigation className="size-4" aria-hidden="true" />
                    {t("openInMaps")}
                  </a>
                ) : null}
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-3xl border p-4">
                <MapPin className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="font-semibold">
                    {job.area}, {job.city}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{t("approxNote")}</p>
                </div>
              </div>
            )}

            <section>
              <h3 className="text-base font-bold">{t("about")}</h3>
              <p className="mt-1.5 leading-relaxed whitespace-pre-line text-muted-foreground">
                {job.description}
              </p>
            </section>

            <FormAlert message={error} />

            {job.requestStatus === "accepted" ? (
              <p className="rounded-3xl bg-success/10 p-4 text-sm leading-relaxed font-medium text-success">
                {t("acceptedNote")}
              </p>
            ) : null}
            {job.requestStatus === "declined" ? (
              <p className="rounded-3xl bg-muted p-4 text-sm leading-relaxed text-muted-foreground">
                {t("declinedNote")}
              </p>
            ) : null}

            {canRequest ? (
              profileReady ? (
                <div className="space-y-3">
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold">{t("messageLabel")}</span>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                      rows={3}
                      placeholder={t("messagePlaceholder")}
                      className="w-full resize-none rounded-2xl border border-input bg-background px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                  </label>
                  <Button size="touch" className="w-full" onClick={send} disabled={pending}>
                    {pending ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : null}
                    {t("send")}
                  </Button>
                  <p className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                    <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    {t("sharesNote")}
                  </p>
                </div>
              ) : (
                <Link
                  href="/employee/profile"
                  className={cn(buttonVariants({ size: "touch" }), "w-full")}
                >
                  {t("finishProfile")}
                </Link>
              )
            ) : null}

            {job.requestStatus === "pending" || job.requestStatus === "accepted" ? (
              <Button
                variant="ghost"
                size="touch"
                className="w-full text-muted-foreground"
                onClick={withdraw}
                disabled={pending}
              >
                {t("withdraw")}
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
