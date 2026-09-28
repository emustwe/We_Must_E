import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Avatar, StatusPill } from "@/components/admin/wm";
import { WmIcon } from "@/components/map/wm-icons";
import { candidateCode } from "@/lib/sponsors/candidate-code";

// One candidate in a list: the full application is visible; the name shows
// once the contact details are opened (until then a code and the price).
export async function CandidateRow({
  jobId,
  applicationId,
  name,
  jobTitle,
  sharedAt,
  unlocked,
  price,
}: {
  jobId: string;
  applicationId: string;
  name: string | null;
  jobTitle?: string;
  sharedAt: string;
  unlocked: boolean;
  price: number;
}) {
  const t = await getTranslations("ecoins");
  const format = await getFormatter();
  const label = name ?? t("candidateLabel", { code: candidateCode(applicationId) });
  return (
    <Link
      href={`/sponsor/jobs/${jobId}/candidates/${applicationId}`}
      className="flex items-center gap-3.5 rounded-[18px] border border-[#EEF0F4] bg-white p-3.5 text-wm-ink no-underline hover:border-wm-tint-line"
    >
      <Avatar name={label} size={44} />
      <span className="flex min-w-0 grow flex-col gap-0.5">
        <span className="truncate text-[15px] font-extrabold">{label}</span>
        <span className="truncate text-xs font-semibold text-wm-caption">
          {jobTitle ? `${jobTitle} · ` : ""}
          {t("sharedOn", {
            date: format.dateTime(new Date(sharedAt), { day: "numeric", month: "short" }),
          })}
        </span>
      </span>
      <StatusPill tone={unlocked ? "ok" : "warn"}>
        {unlocked ? t("open") : t("price", { count: price })}
      </StatusPill>
      <span className="flex text-wm-caption">
        <WmIcon name="chevronRight" size={16} stroke={2.4} />
      </span>
    </Link>
  );
}
