"use client";

import { Coins } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { unlockCandidate } from "@/actions/sponsor-candidates";
import { Button } from "@/components/ui/button";
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
      <p className="max-w-sm rounded-2xl bg-muted px-4 py-3 text-sm font-medium">
        {t("noCoinsBody")}
      </p>
    );
  }
  return (
    <Button
      size="touch"
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
      <Coins className="size-4" aria-hidden="true" />
      {t("unlock")}
    </Button>
  );
}
