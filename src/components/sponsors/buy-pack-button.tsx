"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { buyPack } from "@/actions/payments";
import { btn } from "@/components/admin/wm";
import { WmIcon } from "@/components/map/wm-icons";

// Starts an order for the pack and opens its payment page.
export function BuyPackButton({ packId }: { packId: string }) {
  const t = useTranslations("payments");
  const te = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className={btn("primary")}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await buyPack(packId);
          if (!result.ok) toast.error(te(result.error));
          else router.push(`/sponsor/coins/${result.data.orderId}`);
        })
      }
    >
      <WmIcon name="coin" size={17} stroke={2.2} />
      {pending ? t("buying") : t("buy")}
    </button>
  );
}
