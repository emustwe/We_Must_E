"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { outreachUnsubscribe } from "@/actions/outreach";
import { btn } from "@/components/admin/wm";

export function UnsubscribeButton({ token }: { token: string }) {
  const t = useTranslations("outreachPage");
  const te = useTranslations("errors");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (done) {
    return (
      <p role="status" className="m-0 rounded-2xl bg-wm-mist p-4 text-[15px] font-bold">
        {t("unsubscribed")}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className={btn("dark")}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await outreachUnsubscribe(token);
            if (result.ok) setDone(true);
            else setError(te(result.error));
          })
        }
      >
        {t("unsubscribeButton")}
      </button>
      {error ? (
        <p role="alert" className="m-0 text-sm font-semibold text-wm-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
