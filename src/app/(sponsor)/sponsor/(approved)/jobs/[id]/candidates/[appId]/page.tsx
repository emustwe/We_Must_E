import { ArrowLeft, Mail, MessageCircle, Phone, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { getCandidateVideoUrl } from "@/actions/sponsor-candidates";
import { VideoViewer } from "@/components/admin/application-review";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validations/jobs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("candidate");
  return { title: t("title"), robots: { index: false, follow: false } };
}

type Answer = { options?: number[]; text?: string; number?: number };
type Candidate = {
  id: string;
  job_id: string;
  job_title: string;
  full_name: string;
  phone: string;
  email: string | null;
  test_percent: number | null;
  approved_at: string;
  survey: { prompt: string; type: string; options: string[]; answer: Answer }[];
  video_questions: string[];
  videos: { question_id: string; prompt: string; seconds: number }[];
};

function answerText(q: Candidate["survey"][number]) {
  const a = q.answer;
  if (Array.isArray(a.options))
    return a.options
      .map((i) => q.options[i])
      .filter(Boolean)
      .join(", ");
  if (typeof a.number === "number") return String(a.number);
  return a.text ?? "—";
}

// One approved candidate for the sponsor's job. The database returns only
// what a sponsor may see (never admin notes or test answers).
export default async function CandidatePage({
  params,
}: PageProps<"/sponsor/jobs/[id]/candidates/[appId]">) {
  const { id, appId } = await params;
  if (!idSchema.safeParse(id).success || !idSchema.safeParse(appId).success) notFound();
  await requireRole("employer");
  const t = await getTranslations("candidate");
  const format = await getFormatter();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sponsor_get_candidate", { p_application_id: appId });
  const c = data as Candidate | null;
  if (error || !c || c.job_id !== id) notFound();
  const whatsapp = `https://wa.me/${c.phone.replace(/^\+/, "")}`;

  return (
    <div className="animate-in-fast mx-auto max-w-2xl space-y-5 pt-2">
      <Link
        href={`/sponsor/jobs/${id}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        {c.job_title}
      </Link>

      <section className="shadow-float rounded-[2rem] bg-card p-5 sm:p-7">
        <h1 className="text-2xl font-extrabold tracking-tight break-words">{c.full_name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("approvedOn", {
            date: format.dateTime(new Date(c.approved_at), { dateStyle: "medium" }),
          })}
          {c.test_percent !== null ? ` · ${t("score", { score: Number(c.test_percent) })}` : ""}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <a
            href={`tel:${c.phone}`}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-4 font-semibold text-primary-foreground"
          >
            <Phone className="size-4" aria-hidden="true" />
            {t("call")}
          </a>
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-muted px-4 font-semibold"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            {t("whatsapp")}
          </a>
          {c.email ? (
            <a
              href={`mailto:${c.email}`}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-muted px-4 font-semibold"
            >
              <Mail className="size-4" aria-hidden="true" />
              {t("email")}
            </a>
          ) : null}
        </div>
        <p className="mt-3 text-sm break-all text-muted-foreground" dir="ltr">
          {c.phone}
          {c.email ? ` · ${c.email}` : ""}
        </p>
      </section>

      {c.videos.length ? (
        <section className="shadow-float space-y-4 rounded-3xl bg-card p-5">
          <div>
            <h2 className="text-xl font-extrabold">{t("videos")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("videoAnswersTo")}</p>
            <ol className="mt-2 list-decimal space-y-1 ps-5 text-sm font-semibold">
              {c.video_questions.map((prompt, i) => (
                <li key={i}>{prompt}</li>
              ))}
            </ol>
          </div>
          <p className="text-sm text-muted-foreground">{t("videoNote")}</p>
          {c.videos.map((v) => (
            <VideoViewer
              key={v.question_id}
              applicationId={c.id}
              questionId={v.question_id}
              load={getCandidateVideoUrl}
            />
          ))}
        </section>
      ) : null}

      {c.survey.length ? (
        <section className="shadow-float rounded-3xl bg-card p-5">
          <h2 className="mb-3 text-xl font-extrabold">{t("answers")}</h2>
          <dl className="divide-y">
            {c.survey.map((q) => (
              <div key={q.prompt} className="py-3 first:pt-0 last:pb-0">
                <dt className="text-sm text-muted-foreground">{q.prompt}</dt>
                <dd className="mt-0.5 font-semibold whitespace-pre-line">{answerText(q)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <p className="flex items-start gap-2 rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
        <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {t("privacy")}
      </p>
    </div>
  );
}
