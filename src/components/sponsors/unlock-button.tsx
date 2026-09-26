"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { unlockCandidate } from "@/actions/sponsor-candidates";
import { btn } from "@/components/admin/wm";
import { WmIcon } from "@/components/map/wm-icons";
import { useConfirm } from "@/components/ui/confirm-dialog";

// Spends 1 E-coin (after asking) to open the candidate for good.
export function UnlockButton({
  applicationId,
  balance,
}: {
  applicationId: string;
  balance: number;
}) {
  const t = useTranslations("ecoins");
  const te = useTranslations("errors");
  const ask = useConfirm();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (balance < 1) {
    return (
      <p className="m-0 max-w-sm rounded-2xl bg-wm-land px-4 py-3 text-sm font-semibold text-wm-body">
        {t("noCoinsBody")}
      </p>
    );
  }
  return (
    <button
      type="button"
      className={btn("primary")}
      disabled={pending}
      onClick={async () => {
        const yes = await ask({
          title: t("unlockConfirmTitle"),
          body: t("unlockConfirmBody", { count: balance, after: balance - 1 }),
          confirmLabel: t("unlock"),
        });
        if (!yes) return;
        startTransition(async () => {
          const result = await unlockCandidate(applicationId);
          if (!result.ok) toast.error(te(result.error));
          else {
            toast.success(t("unlocked"));
            router.refresh();
          }
        });
      }}
    >
      <WmIcon name="coin" size={17} stroke={2.2} />
      {t("unlock")}
    </button>
  );
}
