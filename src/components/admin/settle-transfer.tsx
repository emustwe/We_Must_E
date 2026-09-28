"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { settleTransfer } from "@/actions/admin-payments";
import { btn } from "@/components/admin/wm";

// Pays one of the open or expired orders with a transfer that didn't match.
export function SettleTransfer({
  signature,
  orders,
}: {
  signature: string;
  orders: { id: string; label: string }[];
}) {
  const t = useTranslations("adminPayments");
  const te = useTranslations("errors");
  const router = useRouter();
  const [orderId, setOrderId] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`settle-${signature}`}>
        {t("chooseOrder")}
      </label>
      <select
        id={`settle-${signature}`}
        value={orderId}
        onChange={(e) => setOrderId(e.target.value)}
        className="h-9 max-w-[280px] rounded-xl border border-wm-line bg-white px-2 text-sm"
      >
        <option value="">{t("chooseOrder")}</option>
        {orders.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        className={btn("primary", "sm")}
        disabled={!orderId || pending}
        onClick={() =>
          startTransition(async () => {
            const result = await settleTransfer(signature, orderId);
            if (!result.ok) toast.error(te(result.error));
            else {
              toast.success(t("added"));
              router.refresh();
            }
          })
        }
      >
        {t("addTo")}
      </button>
    </div>
  );
}
