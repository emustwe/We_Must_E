import { ArrowLeft, Check, Mail, Phone, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { GradeForm, ReviewPanel, VideoViewer } from "@/components/admin/application-review";
import { APPLICATION_TONE, Badge, Card } from "@/components/admin/ui";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { idSchema } from "@/lib/validations/jobs";
import type { Json } from "@/types/database";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("applicationTitle") };
}

const TABS = ["test", "video", "survey"] as const;
type Tab = (typeof TABS)[number];

const asOptions = (v: Json) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
const field = (answer: Json | undefined, key: string) =>
  answer && typeof answer === "object" && !Array.isArray(answer) ? answer[key] : undefined;
const chosen = (answer: Json | undefined) => {
  const o = field(answer, "options");
  return Array.isArray(o) ? o.filter((x): x is number => typeof x === "number") : [];
};

export default async function ApplicationPage({
  params,
  searchParams,
}: PageProps<"/admin/applications/[id]">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const query = await searchParams;
  const tab: Tab = TABS.find((x) => x === query.tab) ?? "test";
  const t = await getTranslations("admin");
  const ts = await getTranslations("applicationStatus");
  const format = await getFormatter();
  const supabase = await createClient();

  // RLS: only MFA admins can read these tables.
  const { data: app } = await supabase
    .from("applications")
    .select(
      "id, status, submitted_at, reviewed_at, reviewed_by, admin_notes, test_id, video_set_id, survey_id, test_score, test_max_score, test_percent, test_started_at, test_submitted_at, applicant_id, applicants(id, full_name, phone_e164, email), jobs(id, title, location_label, employer_profiles(company_name))",
    )
    .eq("id", id)
    .neq("status", "in_progress")
    .maybeSingle();
  if (!app || !app.applicants || app.status === "in_progress") notFound();

  const [history, reviewer, consent] = await Promise.all([
    supabase
      .from("applications")
      .select("id, status, submitted_at, jobs(title)")
      .eq("applicant_id", app.applicant_id!)
      .neq("id", app.id)
      .neq("status", "in_progress")
      .order("submitted_at", { ascending: false })
      .limit(20),
    app.reviewed_by
      ? supabase.from("profiles").select("full_name").eq("id", app.reviewed_by).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("consents")
      .select("text_version, accepted_at")
      .eq("application_id", app.id)
      .maybeSingle(),
  ]);

  const tabHref = (x: Tab) => `/admin/applications/${app.id}?tab=${x}`;
  const applicant = app.applicants;

  return (
    <div className="space-y-5">
      <Link
        href="/admin/applications"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        {t("applicationsTitle")}
      </Link>

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-5">
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight">{applicant.full_name}</h1>
              <Badge tone={APPLICATION_TONE[app.status]}>{ts(app.status)}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("appliedFor", { job: app.jobs?.title ?? "—" })} ·{" "}
              {app.jobs?.employer_profiles?.company_name} · {app.jobs?.location_label}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <a
                href={`tel:${applicant.phone_e164}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 font-semibold"
                dir="ltr"
              >
                <Phone className="size-4" aria-hidden="true" />
                {applicant.phone_e164}
              </a>
              {applicant.email ? (
                <a
                  href={`mailto:${applicant.email}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 font-semibold"
                >
                  <Mail className="size-4" aria-hidden="true" />
                  {applicant.email}
                </a>
              ) : null}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-2xl bg-muted/60 p-3">
                <dt className="text-xs text-muted-foreground">{t("score")}</dt>
                <dd className="text-xl font-extrabold tabular-nums">
                  {app.test_percent === null ? "—" : `${Number(app.test_percent)}%`}
                </dd>
                <dd className="text-xs text-muted-foreground">
                  {app.test_max_score
                    ? `${Number(app.test_score)} / ${Number(app.test_max_score)}`
                    : ""}
                </dd>
              </div>
              <div className="rounded-2xl bg-muted/60 p-3">
                <dt className="text-xs text-muted-foreground">{t("submittedAt")}</dt>
                <dd className="font-semibold">
                  {app.submitted_at
                    ? format.dateTime(new Date(app.submitted_at), {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "—"}
                </dd>
              </div>
              <div className="rounded-2xl bg-muted/60 p-3">
                <dt className="text-xs text-muted-foreground">{t("consentGiven")}</dt>
                <dd className="font-semibold">
                  {consent.data
                    ? format.dateTime(new Date(consent.data.accepted_at), { dateStyle: "medium" })
                    : "—"}
                </dd>
                <dd className="text-xs text-muted-foreground">{consent.data?.text_version}</dd>
              </div>
            </dl>
          </Card>

          <nav
            aria-label={t("applicationSections")}
            className="flex gap-1 rounded-full bg-muted p-1"
          >
            {TABS.map((x) => (
              <Link
                key={x}
                href={tabHref(x)}
                aria-current={tab === x ? "page" : undefined}
                className={cn(
                  "flex-1 rounded-full py-2 text-center text-sm font-semibold",
                  tab === x
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`tab.${x}`)}
              </Link>
            ))}
          </nav>

          {tab === "test" ? <TestTab applicationId={app.id} testId={app.test_id} /> : null}
          {tab === "video" ? <VideoTab applicationId={app.id} setId={app.video_set_id} /> : null}
          {tab === "survey" ? <SurveyTab applicationId={app.id} surveyId={app.survey_id} /> : null}
        </div>

        <aside className="space-y-5">
          <Card>
            <h2 className="mb-3 font-bold">{t("reviewTitle")}</h2>
            {app.reviewed_at ? (
              <p className="mb-3 text-xs text-muted-foreground">
                {t("reviewedBy", {
                  name: reviewer.data?.full_name || t("admin"),
                  date: format.dateTime(new Date(app.reviewed_at), { dateStyle: "medium" }),
                })}
              </p>
            ) : null}
            <ReviewPanel applicationId={app.id} status={app.status} notes={app.admin_notes ?? ""} />
            <p className="mt-3 text-xs text-muted-foreground">{t("approveNote")}</p>
          </Card>
          <Card>
            <h2 className="mb-3 font-bold">{t("historyTitle")}</h2>
            {!history.data?.length ? (
              <p className="text-sm text-muted-foreground">{t("noHistory")}</p>
            ) : (
              <ul className="space-y-2">
                {history.data.map((h) => (
                  <li key={h.id}>
                    <Link
                      href={`/admin/applications/${h.id}`}
                      className="flex items-center justify-between gap-2 rounded-2xl p-2 text-sm hover:bg-muted/60"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{h.jobs?.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {h.submitted_at
                            ? format.dateTime(new Date(h.submitted_at), { dateStyle: "medium" })
                            : ""}
                        </span>
                      </span>
                      <Badge tone={APPLICATION_TONE[h.status]}>{ts(h.status)}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

async function TestTab({
  applicationId,
  testId,
}: {
  applicationId: string;
  testId: string | null;
}) {
  const t = await getTranslations("admin");
  if (!testId) return <Card>{t("noTest")}</Card>;
  const supabase = await createClient();
  const [{ data: questions }, { data: answers }, { data: keys }] = await Promise.all([
    supabase
      .from("test_questions")
      .select("id, type, prompt, options, points")
      .eq("test_id", testId)
      .order("position"),
    supabase
      .from("application_test_answers")
      .select("question_id, answer, is_correct, points_awarded")
      .eq("application_id", applicationId),
    // Answer keys are only readable through this admin-only function.
    supabase.rpc("admin_get_answer_keys", { p_test_id: testId }),
  ]);
  const answerFor = new Map((answers ?? []).map((a) => [a.question_id, a]));
  const keyFor = new Map((keys ?? []).map((k) => [k.question_id, k.correct_options]));

  return (
    <ol className="space-y-3">
      {(questions ?? []).map((q, i) => {
        const a = answerFor.get(q.id);
        const written = q.type === "short_text" || q.type === "long_text";
        const picked = chosen(a?.answer);
        const correct = keyFor.get(q.id) ?? [];
        return (
          <li key={q.id}>
            <Card>
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold">
                  {i + 1}. {q.prompt}
                </p>
                <Badge
                  tone={
                    !a
                      ? "muted"
                      : written && a.points_awarded === null
                        ? "warning"
                        : a.is_correct
                          ? "success"
                          : "danger"
                  }
                >
                  {!a
                    ? t("notAnswered")
                    : written && a.points_awarded === null
                      ? t("needsGrading")
                      : `${Number(a.points_awarded ?? 0)} / ${q.points}`}
                </Badge>
              </div>
              {written ? (
                <>
                  <p className="mt-3 rounded-2xl bg-muted/60 p-3 text-sm whitespace-pre-line">
                    {String(field(a?.answer, "text") ?? "—")}
                  </p>
                  {a ? (
                    <GradeForm
                      applicationId={applicationId}
                      questionId={q.id}
                      max={q.points}
                      current={a.points_awarded === null ? null : Number(a.points_awarded)}
                    />
                  ) : null}
                </>
              ) : (
                <ul className="mt-3 space-y-1.5">
                  {asOptions(q.options).map((option, oi) => {
                    const isPicked = picked.includes(oi);
                    const isRight = correct.includes(oi);
                    return (
                      <li
                        key={oi}
                        className={cn(
                          "flex items-center gap-2 rounded-xl px-3 py-2 text-sm",
                          isPicked && isRight && "bg-success/15 font-semibold",
                          isPicked && !isRight && "bg-destructive/10 font-semibold",
                          !isPicked && "bg-muted/40",
                        )}
                      >
                        {isRight ? (
                          <Check
                            className="size-4 shrink-0 text-success"
                            aria-label={t("correctAnswer")}
                          />
                        ) : isPicked ? (
                          <X
                            className="size-4 shrink-0 text-destructive"
                            aria-label={t("wrongAnswer")}
                          />
                        ) : (
                          <span className="size-4 shrink-0" aria-hidden="true" />
                        )}
                        <span className="flex-1">{option}</span>
                        {isPicked ? (
                          <span className="text-xs text-muted-foreground">{t("theirAnswer")}</span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </li>
        );
      })}
    </ol>
  );
}

async function VideoTab({ applicationId, setId }: { applicationId: string; setId: string | null }) {
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const [{ data: questions }, { data: videos }] = await Promise.all([
    setId
      ? supabase.from("video_questions").select("id, prompt").eq("set_id", setId).order("position")
      : Promise.resolve({ data: [] as { id: string; prompt: string }[] }),
    supabase
      .from("application_videos")
      .select("question_id, duration_seconds")
      .eq("application_id", applicationId),
  ]);
  const videoFor = new Map((videos ?? []).map((v) => [v.question_id, v]));
  const answered = (questions ?? []).filter((q) => videoFor.has(q.id));
  if (!answered.length) return <Card>{t("noVideos")}</Card>;
  return (
    <ol className="space-y-3">
      {answered.map((q, i) => (
        <li key={q.id}>
          <Card>
            <p className="mb-3 font-semibold">
              {i + 1}. {q.prompt}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                · {t("seconds", { count: videoFor.get(q.id)!.duration_seconds })}
              </span>
            </p>
            <VideoViewer applicationId={applicationId} questionId={q.id} />
          </Card>
        </li>
      ))}
    </ol>
  );
}

async function SurveyTab({
  applicationId,
  surveyId,
}: {
  applicationId: string;
  surveyId: string | null;
}) {
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const [{ data: questions }, { data: answers }] = await Promise.all([
    surveyId
      ? supabase
          .from("survey_questions")
          .select("id, type, prompt, options")
          .eq("survey_id", surveyId)
          .order("position")
      : Promise.resolve({ data: [] }),
    supabase
      .from("application_survey_answers")
      .select("question_id, answer")
      .eq("application_id", applicationId),
  ]);
  const answerFor = new Map((answers ?? []).map((a) => [a.question_id, a.answer]));
  if (!questions?.length) return <Card>{t("noSurvey")}</Card>;
  return (
    <Card>
      <dl className="divide-y">
        {questions.map((q) => {
          const a = answerFor.get(q.id);
          const options = asOptions(q.options);
          const text =
            a === undefined
              ? "—"
              : q.type === "single_choice" || q.type === "multi_choice"
                ? chosen(a)
                    .map((o) => options[o])
                    .filter(Boolean)
                    .join(", ")
                : String(field(a, "text") ?? field(a, "number") ?? "—");
          return (
            <div key={q.id} className="py-3 first:pt-0 last:pb-0">
              <dt className="text-sm text-muted-foreground">{q.prompt}</dt>
              <dd className="mt-0.5 font-semibold whitespace-pre-line">{text}</dd>
            </div>
          );
        })}
      </dl>
    </Card>
  );
}
