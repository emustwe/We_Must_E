import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { OutreachShell } from "@/components/outreach/outreach-shell";
import { UnsubscribeButton } from "@/components/outreach/unsubscribe-button";
import { isOutreachToken } from "@/lib/outreach/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("outreachPage");
  return {
    title: t("unsubscribeTitle"),
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

// "Don't email me again": one button (a link alone never unsubscribes, since
// mail apps open links to check them). Works even if the video link is off.
export default async function UnsubscribePage({ params }: PageProps<"/w/[token]/unsubscribe">) {
  const { token } = await params;
  if (!isOutreachToken(token)) notFound();
  const t = await getTranslations("outreachPage");
  return (
    <OutreachShell>
      <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.7px]">
        {t("unsubscribeTitle")}
      </h1>
      <p className="m-0 text-[15px] leading-relaxed font-medium text-wm-slate">
        {t("unsubscribeBody")}
      </p>
      <UnsubscribeButton token={token} />
    </OutreachShell>
  );
}
