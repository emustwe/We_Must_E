import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { NewContent, PreviewButton } from "@/components/admin/content-new";
import { MissingStepsAlert } from "@/components/admin/missing-steps-alert";
import {
  btn,
  displayTitle,
  IconTile,
  isSample,
  Notice,
  PageHeader,
  StatusPill,
  WCard,
} from "@/components/admin/wm";
import { WmIcon, type IconName } from "@/components/map/wm-icons";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminUi");
  return { title: t("contentTitle") };
}

type Item = {
  id: string;
  title: string;
  is_active: boolean;
  count: number;
  meta: string;
  href: string;
};

export default async function ContentPage() {
  const t = await getTranslations("adminUi");
  const supabase = await createClient();
  const [{ data: surveys }, { data: tests }, { data: videoSets }] = await Promise.all([
    supabase
      .from("surveys")
      .select("id, title, is_active, survey_questions(prompt, position)")
      .order("created_at", { ascending: false }),
    supabase
      .from("tests")
      .select("id, title, is_active, time_limit_seconds, test_questions(prompt, position)")
      .order("created_at", { ascending: false }),
    supabase
      .from("video_question_sets")
      .select("id, title, is_active, video_questions(prompt, position, is_active)")
      .order("created_at", { ascending: false }),
  ]);
  const sorted = (qs: { prompt: string; position: number }[]) =>
    [...qs].sort((a, b) => a.position - b.position).map((q) => q.prompt);

  const cards: {
    kind: "survey" | "test" | "video";
    title: string;
    sub: string;
    icon: IconName;
    tint: [string, string];
    items: (Item & { prompts: string[] })[];
  }[] = [
    {
      kind: "survey",
      title: t("survey"),
      sub: t("surveySub"),
      icon: "checklist",
      tint: ["#E3EAFF", "#2457F5"],
      items: (surveys ?? []).map((s) => ({
        id: s.id,
        title: s.title,
        is_active: s.is_active,
        count: s.survey_questions.length,
        meta: t("questionsMeta", { count: s.survey_questions.length }),
        href: `/admin/content/surveys/${s.id}`,
        prompts: sorted(s.survey_questions),
      })),
    },
    {
      kind: "test",
      title: t("test"),
      sub: t("testSub"),
      icon: "flask",
      tint: ["#FDEBD2", "#B45309"],
      items: (tests ?? []).map((s) => ({
        id: s.id,
        title: s.title,
        is_active: s.is_active,
        count: s.test_questions.length,
        meta: t("testMeta", {
          count: s.test_questions.length,
          minutes: s.time_limit_seconds ? Math.ceil(s.time_limit_seconds / 60) : 0,
        }),
        href: `/admin/content/tests/${s.id}`,
        prompts: sorted(s.test_questions),
      })),
    },
    {
      kind: "video",
      title: t("videoQs"),
      sub: t("videoSub"),
      icon: "video",
      tint: ["#FCE4F1", "#BE185D"],
      items: (videoSets ?? []).map((s) => {
        const live = s.video_questions.filter((q) => q.is_active);
        return {
          id: s.id,
          title: s.title,
          is_active: s.is_active,
          count: live.length,
          meta: t("videoMeta", { count: live.length }),
          href: `/admin/content/videos/${s.id}`,
          prompts: sorted(live),
        };
      }),
    },
  ];

  return (
    <>
      <PageHeader title={t("contentTitle")} body={t("contentBody")} />
      <MissingStepsAlert link={false} />
      <Notice>{t("samplesNote")}</Notice>
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
        {cards.map((card) => {
          const live = card.items.find((i) => i.is_active);
          const others = card.items.filter((i) => !i.is_active);
          return (
            <WCard key={card.kind} className="flex flex-col gap-4 p-[22px]">
              <div className="flex items-center gap-3">
                <IconTile name={card.icon} bg={card.tint[0]} fg={card.tint[1]} iconSize={20} />
                <span className="flex flex-col gap-0.5">
                  <h2 className="m-0 text-lg font-extrabold tracking-[-0.3px]">{card.title}</h2>
                  <span className="text-[13px] font-medium text-wm-slate">{card.sub}</span>
                </span>
              </div>
              {live ? (
                <div className="flex flex-col gap-2.5 rounded-[18px] border border-wm-tint-line bg-[#F7F9FF] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone="ok">{t("live")}</StatusPill>
                    {isSample(live.title) ? (
                      <StatusPill tone="sample">{t("sample")}</StatusPill>
                    ) : null}
                    <span className="ms-auto text-xs font-bold text-wm-slate">{t("inUse")}</span>
                  </div>
                  <span className="text-base font-extrabold break-words">
                    {displayTitle(live.title)}
                  </span>
                  <span className="text-[13px] font-medium text-wm-slate">{live.meta}</span>
                  <div className="flex flex-wrap gap-2">
                    <Link href={live.href} className={btn("secondary", "xs")}>
                      <WmIcon name="pencil" size={17} stroke={2.2} />
                      {t("editQuestions")}
                    </Link>
                    <PreviewButton title={displayTitle(live.title)} questions={live.prompts} />
                  </div>
                </div>
              ) : (
                <div className="rounded-[18px] border border-dashed border-wm-danger-line p-4 text-[13px] font-bold text-wm-danger">
                  {t("noneLive")}
                </div>
              )}
              {others.length ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-wm-caption">{t("others")}</span>
                  <ul className="m-0 flex list-none flex-col gap-1 p-0">
                    {others.map((o) => (
                      <li key={o.id}>
                        <Link
                          href={o.href}
                          className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-wm-ink no-underline hover:bg-wm-mist"
                        >
                          <span className="min-w-0 grow">
                            <span className="block truncate text-sm font-bold">
                              {displayTitle(o.title)}
                            </span>
                            <span className="text-xs font-medium text-wm-caption">{o.meta}</span>
                          </span>
                          <StatusPill tone="idle">{t("draft")}</StatusPill>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <NewContent kind={card.kind} />
            </WCard>
          );
        })}
      </div>
    </>
  );
}
