"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

// Shows a generic message only; details stay in server logs.
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errorPage");
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="max-w-sm text-muted-foreground">{t("body")}</p>
      <Button size="touch" onClick={reset}>
        {t("retry")}
      </Button>
    </main>
  );
}
