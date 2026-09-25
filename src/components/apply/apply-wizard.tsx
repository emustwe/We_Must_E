"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { StartStep } from "@/components/apply/start-step";
import { SurveyStep } from "@/components/apply/survey-step";
import { TestStep } from "@/components/apply/test-step";
import { VideoStep } from "@/components/apply/video-step";
import type { ApplyView } from "@/server/public-application";

type Job = { title: string; locationLabel: string };

export function ApplyWizard({ jobId, job, view }: { jobId: string; job: Job; view: ApplyView }) {
  const t = useTranslations("apply");
  const ask = useConfirm();
  const router = useRouter();
  const steps =
    view.stage === "start"
      ? []
      : [
          ...(view.steps.test ? (["test"] as const) : []),
          ...(view.steps.video ? (["video"] as const) : []),
          "survey" as const,
        ];
  const current = view.stage === "start" ? 0 : steps.indexOf(view.stage) + 1;
  const label = { test: t("stepTest"), video: t("stepVideo"), survey: t("stepSurvey") };

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-4 pt-4 pb-6">
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{job.title}</p>
          <p className="truncate text-xs text-muted-foreground">{job.locationLabel}</p>
        </div>
        <Link
          href={`/?job=${jobId}`}
          onClick={async (e) => {
            if (view.stage === "start") return;
            e.preventDefault();
            if (
              await ask({
                title: t("leaveTitle"),
                body: t("leaveConfirm"),
                confirmLabel: t("leave"),
              })
            ) {
              router.push(`/?job=${jobId}`);
            }
          }}
          aria-label={t("close")}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted hover:bg-muted/70"
        >
          <X className="size-4" aria-hidden="true" />
        </Link>
      </header>

      {steps.length ? (
        <div className="mt-4">
          <p className="text-xs font-semibold text-muted-foreground">
            {t("progress", { current, total: steps.length })} · {label[steps[current - 1]]}
          </p>
          <div
            className="mt-2 flex gap-1.5"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-valuenow={current}
            aria-label={t("progress", { current, total: steps.length })}
          >
            {steps.map((s, i) => (
              <span
                key={s}
                className={`h-1.5 flex-1 rounded-full ${i < current ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
        </div>
      ) : null}

      <main className="mt-6 flex flex-1 flex-col">
        {view.stage === "start" ? <StartStep jobId={jobId} /> : null}
        {view.stage === "test" ? <TestStep key="test" jobId={jobId} view={view} /> : null}
        {view.stage === "video" ? <VideoStep key="video" jobId={jobId} view={view} /> : null}
        {view.stage === "survey" ? <SurveyStep key="survey" jobId={jobId} view={view} /> : null}
      </main>
    </div>
  );
}
