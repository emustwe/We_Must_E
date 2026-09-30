"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { unlockCandidate } from "@/actions/sponsor-candidates";
import { btn } from "@/components/admin/wm";
import { WmIcon } from "@/components/map/wm-icons";
import { useConfirm } from "@/components/ui/confirm-dialog";

// Opens the candidate's contact details for `price` Vera (after asking).
// If the price changed meanwhile, nothing is charged and the page reloads
// with the new price.
export function UnlockButton({
  applicationId,
  balance,
  price,
}: {
  applicationId: string;
  balance: number;
  price: number;
}) {
  const t = useTranslations("ecoins");
  const te = useTranslations("errors");
  const ask = useConfirm();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (balance < price) {
    return (
      <p className="m-0 max-w-sm rounded-2xl bg-wm-land px-4 py-3 text-sm font-semibold text-wm-body">
        {t("noCoinsBody", { price, balance })}
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
          title: t("unlockConfirmTitle", { count: price }),
          body: t("unlockConfirmBody", { balance, after: balance - price }),
          confirmLabel: t("unlock", { count: price }),
        });
        if (!yes) return;
        startTransition(async () => {
          const result = await unlockCandidate(applicationId, price);
          if (!result.ok) {
            toast.error(te(result.error));
            if (result.error === "priceChanged") router.refresh();
          } else {
            toast.success(t("unlocked"));
            router.refresh();
          }
        });
      }}
    >
      <WmIcon name="coin" size={17} stroke={2.2} />
      {t("unlock", { count: price })}
    </button>
  );
}
