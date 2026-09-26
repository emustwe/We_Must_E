import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Avatar, StatusPill } from "@/components/admin/wm";
import { WmIcon } from "@/components/map/wm-icons";

// One candidate in a list: the name is always visible; the rest opens with an E-coin.
export async function CandidateRow({
  jobId,
  applicationId,
  name,
  jobTitle,
  sharedAt,
  unlocked,
}: {
  jobId: string;
  applicationId: string;
  name: string;
  jobTitle?: string;
  sharedAt: string;
  unlocked: boolean;
}) {
  const t = await getTranslations("ecoins");
  const format = await getFormatter();
  return (
    <Link
      href={`/sponsor/jobs/${jobId}/candidates/${applicationId}`}
      className="flex items-center gap-3.5 rounded-[18px] border border-[#EEF0F4] bg-white p-3.5 text-wm-ink no-underline hover:border-wm-tint-line"
    >
      <Avatar name={name} size={44} />
      <span className="flex min-w-0 grow flex-col gap-0.5">
        <span className="truncate text-[15px] font-extrabold">{name}</span>
        <span className="truncate text-xs font-semibold text-wm-caption">
          {jobTitle ? `${jobTitle} · ` : ""}
          {t("sharedOn", {
            date: format.dateTime(new Date(sharedAt), { day: "numeric", month: "short" }),
          })}
        </span>
      </span>
      <StatusPill tone={unlocked ? "ok" : "warn"}>{unlocked ? t("open") : t("new")}</StatusPill>
      <span className="flex text-wm-caption">
        <WmIcon name="chevronRight" size={16} stroke={2.4} />
      </span>
    </Link>
  );
}
