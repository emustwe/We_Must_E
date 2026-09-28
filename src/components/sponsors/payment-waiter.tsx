"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { paymentStatus } from "@/actions/payments";
import { btn } from "@/components/admin/wm";
import { WmIcon } from "@/components/map/wm-icons";

const POLL_MS = 5000;

// While an order waits: the time left, a check every few seconds (the server
// looks at the blockchain), and "I've paid — check now". When the payment is
// in, the page reloads to show it.
export function PaymentWaiter({ orderId, expiresAt }: { orderId: string; expiresAt: string }) {
  const t = useTranslations("payments");
  const te = useTranslations("errors");
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let stop = false;
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    const poll = window.setInterval(async () => {
      const result = await paymentStatus(orderId, false);
      if (!stop && result.ok && result.data.status !== "pending") router.refresh();
    }, POLL_MS);
    return () => {
      stop = true;
      window.clearInterval(tick);
      window.clearInterval(poll);
    };
  }, [orderId, router]);

  const left = Math.max(0, new Date(expiresAt).getTime() - now);
  const time = `${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, "0")}`;

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 flex items-center gap-2 text-sm font-bold text-wm-body" role="timer">
        <WmIcon name="shieldClock" size={16} stroke={2.2} />
        {t("timeLeft", { time })}
      </p>
      <p className="m-0 text-[13px] font-medium text-wm-slate">{t("waitingNote")}</p>
      <button
        type="button"
        className={btn("secondary")}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await paymentStatus(orderId, true);
            if (!result.ok) toast.error(te(result.error));
            else if (result.data.status !== "pending") router.refresh();
          })
        }
      >
        <WmIcon name="search" size={17} stroke={2.2} />
        {pending ? t("checking") : t("checkNow")}
      </button>
    </div>
  );
}
