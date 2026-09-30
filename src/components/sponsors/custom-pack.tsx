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

// The "any amount" card: the sponsor types a number of Era (above 300) and
// sees the price before paying. Its rows line up with the pack cards.
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
      <span className="flex h-12 items-center gap-2 text-2xl font-extrabold tracking-[-0.6px]">
        <input
          type="number"
          inputMode="numeric"
          min={CUSTOM_MIN_COINS}
          max={CUSTOM_MAX_COINS}
          step={1}
          aria-label={t("customLabel")}
          aria-describedby="custom-pack-note"
          className="h-12 w-0 min-w-0 grow rounded-xl border border-[#D5DAE2] bg-white px-3 text-2xl font-extrabold tracking-[-0.6px]"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        Era
      </span>
      <span className="text-lg font-bold">{pack ? formatUsd(pack.usdCents) : "—"}</span>
      <span
        id="custom-pack-note"
        className={`text-[13px] font-medium ${pack || !value.trim() ? "text-wm-slate" : "text-wm-danger"}`}
      >
        {pack || !value.trim()
          ? t("customPer", { price: formatUsd(CUSTOM_CENTS_PER_COIN) })
          : t("customRange", {
              min: CUSTOM_MIN_COINS,
              max: CUSTOM_MAX_COINS.toLocaleString("en-US"),
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
