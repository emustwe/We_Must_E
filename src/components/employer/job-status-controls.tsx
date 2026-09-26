"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { closeJob } from "@/actions/employer";
import { btn } from "@/components/admin/wm";
import { WmIcon } from "@/components/map/wm-icons";
import { useConfirm } from "@/components/ui/confirm-dialog";
import type { JobStatus } from "@/lib/jobs/meta";

// Employers can close a live job. Hiding, removing and re-opening are admin-only.
export function JobStatusControls({ jobId, status }: { jobId: string; status: JobStatus }) {
  const t = useTranslations("employerJob");
  const te = useTranslations("errors");
  const [pending, startTransition] = useTransition();
  const ask = useConfirm();

  if (status !== "published") return null;
  return (
    <button
      type="button"
      disabled={pending}
      className={btn("danger")}
      onClick={async () => {
        if (
          !(await ask({
            title: t("close"),
            body: t("closeConfirm"),
            tone: "danger",
            confirmLabel: t("close"),
          }))
        )
          return;
        startTransition(async () => {
          const result = await closeJob({ jobId, status: "closed" });
          if (!result.ok) toast.error(te(result.error));
          else toast.success(t("closedToast"));
        });
      }}
    >
      <WmIcon name="close" size={17} stroke={2.2} />
      {t("close")}
    </button>
  );
}
