import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { missingSteps } from "@/lib/content/live-steps";

// "Applicants skip the video step: no live video questions."
export async function MissingStepsAlert({ link = true }: { link?: boolean }) {
  const missing = await missingSteps();
  if (!missing.length) return null;
  const t = await getTranslations("admin");
  const names = missing.map((s) => t(`stepName.${s}`)).join(", ");
  return (
    <div
      role="alert"
      className="mb-5 flex items-start gap-3 rounded-3xl border-2 border-destructive/40 bg-destructive/10 p-4"
    >
      <TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
      <div className="text-sm">
        <p className="font-bold text-destructive">{t("missingStepsTitle", { steps: names })}</p>
        <p className="mt-1">{t("missingStepsBody")}</p>
        {link ? (
          <Link
            href="/admin/content"
            className="mt-2 inline-block font-semibold text-primary hover:underline"
          >
            {t("missingStepsLink")}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
