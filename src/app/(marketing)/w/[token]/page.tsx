import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { WmIcon } from "@/components/map/wm-icons";
import { OpenedBeacon } from "@/components/outreach/opened-beacon";
import { OutreachShell } from "@/components/outreach/outreach-shell";
import { OUTREACH_THUMB_PATH, OUTREACH_VIDEO_URL } from "@/lib/outreach/config";
import { firstName } from "@/lib/outreach/parse";
import { outreachByToken } from "@/server/outreach";

// Private: only people with the link from our email; never listed by search
// engines, and the link isn't passed on to other sites.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("outreachPage");
  return {
    title: t("metaTitle"),
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

// The video page a company opens from our email: the video, what WemustE
// does, and "Become a sponsor" (their details filled in).
export default async function OutreachPage({ params }: PageProps<"/w/[token]">) {
  const { token } = await params;
  const contact = await outreachByToken(token);
  if (!contact) notFound();
  const t = await getTranslations("outreachPage");
  const points = [t("point1"), t("point2"), t("point3")];

  return (
    <OutreachShell>
      <OpenedBeacon token={token} />
      <div className="flex flex-col gap-1.5">
        <p className="m-0 text-sm font-bold text-wm-blue">
          {t("hello", { name: firstName(contact.name) })}
        </p>
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.7px] sm:text-[32px]">
          {t("title", { company: contact.company })}
        </h1>
      </div>

      {OUTREACH_VIDEO_URL ? (
        <video
          controls
          playsInline
          preload="metadata"
          poster={OUTREACH_THUMB_PATH}
          src={OUTREACH_VIDEO_URL}
          className="aspect-video w-full rounded-2xl bg-wm-ink"
        />
      ) : (
        <div className="relative overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element -- a fixed picture, same as in the email */}
          <img
            src={OUTREACH_THUMB_PATH}
            alt=""
            width={1120}
            height={630}
            className="block aspect-video w-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-wm-ink/55 p-4 backdrop-blur-[3px]">
            <span className="rounded-full bg-white px-4 py-2 text-sm font-extrabold text-wm-ink shadow-wm-2">
              {t("comingSoon")}
            </span>
          </div>
        </div>
      )}

      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {points.map((point) => (
          <li
            key={point}
            className="flex items-start gap-3 rounded-2xl bg-wm-mist p-3.5 text-[15px] leading-snug font-semibold"
          >
            <span className="mt-0.5 text-wm-blue">
              <WmIcon name="check" size={18} stroke={2.6} />
            </span>
            {point}
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2">
        <Link
          href={`/for-sponsors?c=${token}`}
          className="flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-wm-blue text-base font-extrabold text-white no-underline shadow-wm-blue"
        >
          {t("cta")}
          <WmIcon name="chevronRight" size={18} stroke={2.6} />
        </Link>
        <p className="m-0 text-center text-[13px] font-medium text-wm-slate">{t("ctaNote")}</p>
      </div>

      <p className="m-0 border-t border-wm-line pt-4 text-center text-xs font-medium text-wm-caption">
        {t("unsubscribeNote")}{" "}
        <Link href={`/w/${token}/unsubscribe`} className="font-semibold text-wm-slate underline">
          {t("unsubscribe")}
        </Link>
      </p>
    </OutreachShell>
  );
}
