import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { WmIcon } from "@/components/map/wm-icons";
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
      className="flex items-start gap-3 rounded-2xl border border-wm-danger-line bg-[#FFF5F5] px-[18px] py-3.5 text-sm"
    >
      <span className="mt-0.5 shrink-0 text-wm-danger">
        <WmIcon name="info" size={18} stroke={2.1} />
      </span>
      <div>
        <p className="font-bold text-wm-danger">{t("missingStepsTitle", { steps: names })}</p>
        <p className="mt-1 font-medium text-wm-body">{t("missingStepsBody")}</p>
        {link ? (
          <Link href="/admin/content" className="mt-1.5 inline-block font-bold text-wm-blue">
            {t("missingStepsLink")}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
