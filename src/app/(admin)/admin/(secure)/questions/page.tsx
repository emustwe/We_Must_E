import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { QuestionGenerator } from "@/components/admin/question-generator";
import { EmptyRow, PageHeader, WCard } from "@/components/admin/wm";
import { WmIcon } from "@/components/map/wm-icons";
import { createClient } from "@/lib/supabase/server";
import { questionAiConfigured } from "@/server/question-builder";

// Writing the questions takes the AI up to about a minute.
export const maxDuration = 120;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminQuestions");
  return { title: t("title") };
}

// Question builder: generate a job's Exam and Execute questions, and the
// saved sets with how many jobs use each.
export default async function QuestionBuilderPage() {
  const t = await getTranslations("adminQuestions");
  const format = await getFormatter();
  const supabase = await createClient();
  const { data: builds } = await supabase
    .from("question_builds")
    .select("id, title, created_at, test_id")
    .order("created_at", { ascending: false })
    .limit(200);
  const testIds = (builds ?? []).map((b) => b.test_id);
  const { data: jobs } = testIds.length
    ? await supabase.from("jobs").select("test_id").in("test_id", testIds)
    : { data: [] };
  const used = (testId: string) => (jobs ?? []).filter((j) => j.test_id === testId).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} body={t("body")} />
      <WCard className="flex flex-col gap-3 p-6">
        <h2 className="m-0 text-lg font-extrabold tracking-[-0.3px]">{t("newTitle")}</h2>
        <QuestionGenerator aiReady={questionAiConfigured()} />
      </WCard>
      <section className="flex flex-col gap-3">
        <h2 className="m-0 text-lg font-extrabold tracking-[-0.3px]">{t("savedTitle")}</h2>
        {!builds?.length ? (
          <EmptyRow>{t("empty")}</EmptyRow>
        ) : (
          <ul className="m-0 grid list-none gap-3 p-0 xl:grid-cols-2">
            {builds.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/admin/questions/${b.id}`}
                  className="flex items-center gap-4 rounded-3xl bg-white p-5 text-wm-ink no-underline shadow-wm-1 hover:shadow-wm-2"
                >
                  <span className="flex min-w-0 grow flex-col gap-1">
                    <span className="text-base font-extrabold">{b.title}</span>
                    <span className="text-xs font-semibold text-wm-caption">
                      {t("created", {
                        date: format.dateTime(new Date(b.created_at), { dateStyle: "medium" }),
                      })}
                    </span>
                    <span className="text-[13px] font-semibold text-wm-slate">
                      {t("jobsCount", { count: used(b.test_id) })}
                    </span>
                  </span>
                  <span className="text-wm-caption">
                    <WmIcon name="chevronRight" size={16} stroke={2.4} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
