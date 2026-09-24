"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/result";

// Runs a step action and reloads the server state on success. When the
// server says the step is already done or the session ended, the page
// refreshes to show where the visitor really is.
export function useStepAction() {
  const router = useRouter();
  const te = useTranslations("errors");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run<T>(
    action: () => Promise<ActionResult<T>>,
    { refresh = true, onOk }: { refresh?: boolean; onOk?: (data: T) => void } = {},
  ) {
    setError(null);
    return new Promise<boolean>((resolve) => {
      startTransition(async () => {
        const result = await action();
        if (result.ok) {
          onOk?.(result.data);
          if (refresh) router.refresh();
          resolve(true);
          return;
        }
        setError(te(result.error));
        if (result.error === "wrongStep" || result.error === "sessionExpired") router.refresh();
        resolve(false);
      });
    });
  }

  return { run, pending, error, setError };
}
