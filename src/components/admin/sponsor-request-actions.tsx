"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { handleSponsorRequest } from "@/actions/sponsor-request";
import { btn } from "@/components/admin/wm";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function DeclineRequestButton({ requestId }: { requestId: string }) {
  const t = useTranslations("adminUi");
  const te = useTranslations("errors");
  const ask = useConfirm();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={btn("secondary", "sm")}
      onClick={async () => {
        const yes = await ask({
          title: t("requestDeclineTitle"),
          body: t("requestDeclineBody"),
          confirmLabel: t("requestDecline"),
          tone: "danger",
        });
        if (!yes) return;
        startTransition(async () => {
          const result = await handleSponsorRequest({ requestId, status: "declined" });
          if (!result.ok) toast.error(te(result.error));
          else router.refresh();
        });
      }}
    >
      {t("requestDecline")}
    </button>
  );
}
