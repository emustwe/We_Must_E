import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { QuestionConnect, type PendingSponsor } from "@/components/admin/question-connect";
import { btn, EmptyRow, PageHeader, StatusPill, WCard } from "@/components/admin/wm";
import { WmIcon } from "@/components/map/wm-icons";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validations/jobs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminQuestions");
  return { title: t("title") };
}

const TONE = { pending: "warn", published: "ok", rejected: "danger" } as const;

// One saved question set: connect it with a sponsor's job waiting for
// approval, see the jobs that use it, and read its questions.
export default async function QuestionBuildPage({ params }: PageProps<"/admin/questions/[id]">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const t = await getTranslations("adminQuestions");
  const format = await getFormatter();
  const supabase = await createClient();
  const { data: build } = await supabase
    .from("question_builds")
    .select("id, title, created_at, test_id, video_set_id")
    .eq("id", id)
    .maybeSingle();
  if (!build) notFound();
  const [{ data: waiting }, { data: connected }, { data: test }, { data: videos }] =
    await Promise.all([
      supabase
        .from("jobs")
        .select("id, title, location_label, test_id, employer_id, employer_profiles(company_name)")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("jobs")
        .select("id, title, location_label, status, employer_profiles(company_name)")
        .eq("test_id", build.test_id)
        .order("created_at", { ascending: false }),
      supabase
        .from("test_questions")
        .select("id, prompt, type, options")
        .eq("test_id", build.test_id)
        .order("position"),
      supabase
        .from("video_questions")
        .select("id, prompt")
        .eq("set_id", build.video_set_id)
        .order("position"),
    ]);

  const bySponsor = new Map<string, PendingSponsor>();
  for (const j of waiting ?? []) {
    const s = bySponsor.get(j.employer_id) ?? {
      id: j.employer_id,
      name: j.employer_profiles?.company_name ?? "—",
      jobs: [],
    };
    s.jobs.push({
      id: j.id,
      title: j.title,
      place: j.location_label ?? "",
      current: j.test_id === build.test_id,
    });
    bySponsor.set(j.employer_id, s);
  }
  const sponsors = [...bySponsor.values()].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/questions" className="text-sm font-bold text-wm-blue no-underline">
        ← {t("back")}
      </Link>
      <PageHeader
        title={build.title}
        body={t("created", {
          date: format.dateTime(new Date(build.created_at), { dateStyle: "medium" }),
        })}
        actions={
          <>
            <Link href={`/admin/content/tests/${build.test_id}`} className={btn("secondary")}>
              <WmIcon name="pencil" size={16} stroke={2.2} />
              {t("editTest")}
            </Link>
            <Link href={`/admin/content/videos/${build.video_set_id}`} className={btn("secondary")}>
              <WmIcon name="video" size={16} stroke={2.2} />
              {t("editVideos")}
            </Link>
          </>
        }
      />

      <WCard className="flex flex-col gap-3 p-6">
        <h2 className="m-0 text-lg font-extrabold tracking-[-0.3px]">{t("connectTitle")}</h2>
        <p className="m-0 text-[13px] font-medium text-wm-slate">{t("connectBody")}</p>
        <QuestionConnect buildId={build.id} sponsors={sponsors} />
      </WCard>

      <WCard className="flex flex-col gap-3 p-6">
        <h2 className="m-0 text-lg font-extrabold tracking-[-0.3px]">{t("connectedTitle")}</h2>
        {!connected?.length ? (
          <EmptyRow>{t("noConnected")}</EmptyRow>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {connected.map((j) => (
              <li
                key={j.id}
                className="flex flex-wrap items-center gap-3 border-b border-wm-line py-3 last:border-0"
              >
                <span className="flex min-w-0 grow flex-col">
                  <span className="text-sm font-extrabold">{j.title}</span>
                  <span className="text-xs font-semibold text-wm-caption">
                    {[j.employer_profiles?.company_name, j.location_label]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <StatusPill tone={TONE[j.status as keyof typeof TONE] ?? "idle"}>
                  {t(`jobStatus.${j.status}`)}
                </StatusPill>
              </li>
            ))}
          </ul>
        )}
      </WCard>

      <WCard className="flex flex-col gap-3 p-6">
        <h2 className="m-0 text-lg font-extrabold tracking-[-0.3px]">{t("questionsTitle")}</h2>
        <h3 className="m-0 text-sm font-extrabold text-wm-blue">{t("section1")}</h3>
        <ol className="m-0 flex flex-col gap-2 ps-5">
          {(test ?? []).map((q) => (
            <li
              key={q.id}
              className="text-sm leading-relaxed font-medium whitespace-pre-line text-wm-body"
            >
              {q.prompt}
              {q.type === "typing" && Array.isArray(q.options) ? (
                <span className="mt-1 block rounded-xl bg-wm-land p-3 text-[13px]">
                  {String(q.options[0] ?? "")}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
        <h3 className="m-0 text-sm font-extrabold text-wm-blue">{t("section2")}</h3>
        <ol className="m-0 flex flex-col gap-2 ps-5">
          {(videos ?? []).map((v) => (
            <li
              key={v.id}
              className="text-sm leading-relaxed font-medium whitespace-pre-line text-wm-body"
            >
              {v.prompt}
            </li>
          ))}
        </ol>
        <h3 className="m-0 text-sm font-extrabold text-wm-blue">{t("section3")}</h3>
        <p className="m-0 text-[13px] font-medium text-wm-slate">{t("section3Note")}</p>
      </WCard>
    </div>
  );
}
