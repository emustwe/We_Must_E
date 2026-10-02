"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { attachQuestionBuild } from "@/actions/question-builder";
import { btn } from "@/components/admin/wm";
import { WmIcon } from "@/components/map/wm-icons";
import { useConfirm } from "@/components/ui/confirm-dialog";

export type PendingSponsor = {
  id: string;
  name: string;
  jobs: { id: string; title: string; place: string; current: boolean }[];
};

// "Connect with a job": a sponsor, then one of their jobs waiting for approval.
export function QuestionConnect({
  buildId,
  sponsors,
}: {
  buildId: string;
  sponsors: PendingSponsor[];
}) {
  const t = useTranslations("adminQuestions");
  const te = useTranslations("errors");
  const router = useRouter();
  const confirm = useConfirm();
  const [sponsorId, setSponsorId] = useState("");
  const [pending, startTransition] = useTransition();
  const sponsor = sponsors.find((s) => s.id === sponsorId);

  if (!sponsors.length) {
    return <p className="m-0 text-sm font-semibold text-wm-slate">{t("noPendingJobs")}</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold">{t("sponsor")}</span>
        <select
          value={sponsorId}
          onChange={(e) => setSponsorId(e.target.value)}
          className="h-11 max-w-md rounded-xl border border-[#D5DAE2] bg-white px-3 text-sm font-semibold"
        >
          <option value="">{t("chooseSponsor")}</option>
          {sponsors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({t("pendingJobs", { count: s.jobs.length })})
            </option>
          ))}
        </select>
      </label>
      {sponsor ? (
        <ul className="m-0 flex list-none flex-col p-0">
          {sponsor.jobs.map((job) => (
            <li
              key={job.id}
              className="flex flex-wrap items-center gap-3 border-b border-wm-line py-3 last:border-0"
              data-job={job.id}
            >
              <span className="flex min-w-0 grow flex-col">
                <span className="text-sm font-extrabold">{job.title}</span>
                <span className="text-xs font-semibold text-wm-caption">{job.place}</span>
              </span>
              {job.current ? (
                <span className="text-xs font-bold text-wm-ok">{t("current")}</span>
              ) : (
                <button
                  type="button"
                  className={btn("primary", "sm")}
                  disabled={pending}
                  onClick={async () => {
                    // Asked before the update starts: a pop-up opened inside
                    // a transition would only show once it ended.
                    const yes = await confirm({
                      title: t("attachTitle"),
                      body: t("attachBody", { job: job.title }),
                      confirmLabel: t("attach"),
                    });
                    if (!yes) return;
                    startTransition(async () => {
                      const result = await attachQuestionBuild({ buildId, jobId: job.id });
                      if (!result.ok) toast.error(te(result.error));
                      else {
                        toast.success(t("attached"));
                        router.refresh();
                      }
                    });
                  }}
                >
                  <WmIcon name="check" size={15} stroke={2.4} />
                  {t("attach")}
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
