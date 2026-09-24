"use client";

import { Loader2, Mail, MessageCircle, Phone, Video } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { respondToApplication } from "@/actions/employer";
import { StatusBadge } from "@/components/jobs/job-card";
import { Button, buttonVariants } from "@/components/ui/button";
import type { ApplicationStatus, Availability } from "@/lib/jobs/meta";
import { cn } from "@/lib/utils";

export type Applicant = {
  id: string;
  status: ApplicationStatus;
  message: string | null;
  createdAt: string;
  headline: string | null;
  city: string | null;
  languages: string[];
  skills: string[];
  availability: Availability[];
  testScore: number | null;
  videoCount: number;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
};

const digits = (value: string) => value.replace(/[^\d+]/g, "");

export function ApplicantList({ applicants }: { applicants: Applicant[] }) {
  const t = useTranslations("employerJob");
  const ts = useTranslations("schedule");
  const te = useTranslations("errors");
  const format = useFormatter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function respond(id: string, accept: boolean) {
    setBusyId(id);
    startTransition(async () => {
      const result = await respondToApplication({ applicationId: id, accept });
      setBusyId(null);
      if (!result.ok) return void toast.error(te(result.error));
      toast.success(accept ? t("acceptedToast") : t("declinedToast"));
    });
  }

  if (!applicants.length) {
    return (
      <p className="rounded-3xl border-2 border-dashed p-8 text-center text-muted-foreground">
        {t("noApplicants")}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {applicants.map((a) => (
        <li key={a.id} className="shadow-float rounded-3xl bg-card p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold">{a.fullName ?? a.headline ?? "—"}</p>
              {a.fullName && a.headline ? (
                <p className="text-sm text-muted-foreground">{a.headline}</p>
              ) : null}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {[a.city, a.languages.join(", ")].filter(Boolean).join(" · ")} ·{" "}
                {format.relativeTime(new Date(a.createdAt))}
              </p>
            </div>
            <StatusBadge status={a.status} />
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
            <span
              className={cn(
                "rounded-full px-2.5 py-1 font-semibold",
                a.testScore !== null
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {a.testScore !== null
                ? t("testScore", { score: Math.round(a.testScore) })
                : t("noTest")}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-semibold">
              <Video className="size-3" aria-hidden="true" />
              {t("videos", { count: a.videoCount })}
            </span>
            {a.availability.map((s) => (
              <span key={s} className="rounded-full bg-muted px-2.5 py-1 font-medium">
                {ts(s)}
              </span>
            ))}
            {a.skills.slice(0, 5).map((skill) => (
              <span key={skill} className="rounded-full border px-2.5 py-1 font-medium">
                {skill}
              </span>
            ))}
          </div>

          {a.message ? (
            <p className="mt-3 rounded-2xl bg-muted/70 p-3 text-sm leading-relaxed whitespace-pre-line">
              “{a.message}”
            </p>
          ) : null}

          {a.status === "pending" ? (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                size="touch"
                className="sm:flex-1"
                disabled={busyId === a.id}
                onClick={() => respond(a.id, true)}
              >
                {busyId === a.id ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : null}
                {t("accept")}
              </Button>
              <Button
                size="touch"
                variant="secondary"
                className="sm:flex-1"
                disabled={busyId === a.id}
                onClick={() => respond(a.id, false)}
              >
                {t("decline")}
              </Button>
            </div>
          ) : null}
          {a.status === "pending" ? (
            <p className="mt-2 text-xs text-muted-foreground">{t("hiddenUntilAccept")}</p>
          ) : null}

          {a.status === "accepted" ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {a.phone ? (
                <a href={`tel:${digits(a.phone)}`} className={buttonVariants({ size: "pill" })}>
                  <Phone className="size-4" aria-hidden="true" />
                  {t("call")}
                </a>
              ) : null}
              {a.whatsapp ? (
                <a
                  href={`https://wa.me/${digits(a.whatsapp).replace("+", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ size: "pill", variant: "secondary" })}
                >
                  <MessageCircle className="size-4" aria-hidden="true" />
                  {t("whatsapp")}
                </a>
              ) : null}
              {a.email ? (
                <a
                  href={`mailto:${a.email}`}
                  className={buttonVariants({ size: "pill", variant: "outline" })}
                >
                  <Mail className="size-4" aria-hidden="true" />
                  {a.email}
                </a>
              ) : null}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
