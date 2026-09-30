"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { buyPack } from "@/actions/payments";
import { btn } from "@/components/admin/wm";
import { WmIcon } from "@/components/map/wm-icons";
import {
  CUSTOM_CENTS_PER_COIN,
  CUSTOM_MAX_COINS,
  CUSTOM_MIN_COINS,
  CUSTOM_PACK_ID,
  customPack,
  formatUsd,
} from "@/lib/payments/config";

// The "any amount" card: the sponsor types a number of Era (300 or more) and
// sees the price before paying.
export function CustomPack({ canPay }: { canPay: boolean }) {
  const t = useTranslations("payments");
  const te = useTranslations("errors");
  const router = useRouter();
  const [value, setValue] = useState(String(CUSTOM_MIN_COINS));
  const [pending, startTransition] = useTransition();
  const coins = Number(value);
  const pack = value.trim() ? customPack(coins) : undefined;
  return (
    <li
      className="flex flex-col gap-3 rounded-3xl bg-white p-6 shadow-wm-1"
      data-pack={CUSTOM_PACK_ID}
    >
      <span className="flex size-11 items-center justify-center rounded-2xl bg-wm-tint text-wm-blue">
        <WmIcon name="coin" size={20} stroke={2.2} />
      </span>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold">{t("customLabel")}</span>
        <input
          type="number"
          inputMode="numeric"
          min={CUSTOM_MIN_COINS}
          max={CUSTOM_MAX_COINS}
          step={1}
          className="h-11 rounded-xl border border-[#D5DAE2] bg-white px-3.5 text-lg font-extrabold"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-describedby="custom-pack-note"
        />
      </label>
      <span className="text-lg font-bold">{pack ? formatUsd(pack.usdCents) : "—"}</span>
      <span id="custom-pack-note" className="text-[13px] font-medium text-wm-slate">
        {pack
          ? t("perCoin", { price: formatUsd(CUSTOM_CENTS_PER_COIN) })
          : t("customRange", {
              min: CUSTOM_MIN_COINS,
              max: CUSTOM_MAX_COINS,
              price: formatUsd(CUSTOM_CENTS_PER_COIN),
            })}
      </span>
      {canPay ? (
        <button
          type="button"
          className={btn("primary")}
          disabled={pending || !pack}
          onClick={() =>
            startTransition(async () => {
              const result = await buyPack(CUSTOM_PACK_ID, coins);
              if (!result.ok) toast.error(te(result.error));
              else router.push(`/sponsor/coins/${result.data.orderId}`);
            })
          }
        >
          <WmIcon name="coin" size={17} stroke={2.2} />
          {pending ? t("buying") : t("buy")}
        </button>
      ) : null}
    </li>
  );
}
