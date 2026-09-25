import { ArrowLeft, Lock, Mail, MessageCircle, Phone, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { getCandidateVideoUrl } from "@/actions/sponsor-candidates";
import { VideoViewer } from "@/components/admin/application-review";
import { UnlockButton } from "@/components/sponsors/unlock-button";
import { getEmployerAccount } from "@/lib/auth/employer";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validations/jobs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("candidate");
  return { title: t("title"), robots: { index: false, follow: false } };
}

type Answer = { options?: number[]; text?: string; number?: number } | null;
type Item = { prompt: string; type: string; options: string[]; answer: Answer };
type Candidate = {
  id: string;
  job_id: string;
  job_title: string;
  full_name: string;
  phone: string;
  email: string | null;
  approved_at: string;
  test: Item[];
  survey: Item[];
  video_questions: string[];
  videos: { id: string; seconds: number }[];
};

function answerText(q: Item) {
  const a = q.answer;
  if (!a) return "—";
  if (Array.isArray(a.options))
    return (
      a.options
        .map((i) => q.options[i])
        .filter(Boolean)
        .join(", ") || "—"
    );
  if (typeof a.number === "number") return String(a.number);
  return a.text || "—";
}

// A candidate approved by the Wemuste team for this sponsor's job. The name
// is always visible; everything else opens with 1 E-coin and then stays open.
export default async function CandidatePage({
  params,
}: PageProps<"/sponsor/jobs/[id]/candidates/[appId]">) {
  const { id, appId } = await params;
  if (!idSchema.safeParse(id).success || !idSchema.safeParse(appId).success) notFound();
  const { employer } = await getEmployerAccount();
  const t = await getTranslations("candidate");
  const te = await getTranslations("ecoins");
  const format = await getFormatter();
  const supabase = await createClient();

  const { data: summaryRows } = await supabase.rpc("sponsor_candidate_summary", {
    p_application_id: appId,
  });
  const summary = summaryRows?.[0];
  if (!summary || summary.job_id !== id) notFound();

  const back = (
    <Link
      href={`/sponsor/jobs/${id}`}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
      {summary.job_title}
    </Link>
  );
  const shared = t("approvedOn", {
    date: format.dateTime(new Date(summary.reviewed_at), { dateStyle: "medium" }),
  });

  // ------------------------------------------------------------ locked
  if (!summary.unlocked) {
    const balance = employer?.ecoin_balance ?? 0;
    return (
      <div className="animate-in-fast mx-auto max-w-2xl space-y-5 pt-2">
        {back}
        <section className="shadow-float rounded-[2rem] bg-card p-5 sm:p-7">
          <h1 className="text-2xl font-extrabold tracking-tight break-words">
            {summary.full_name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{shared}</p>
          <div className="relative mt-5 overflow-hidden rounded-3xl">
            {/* A blurred stand-in: no real data is sent until the candidate is opened. */}
            <div aria-hidden="true" className="space-y-3 p-4 blur-sm select-none">
              <div className="h-12 rounded-2xl bg-muted" />
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-4 w-1/2 rounded bg-muted" />
              <div className="aspect-video rounded-2xl bg-muted" />
              <div className="h-4 w-2/3 rounded bg-muted" />
              <div className="h-4 w-5/6 rounded bg-muted" />
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/60 p-6 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-brand-accent/20">
                <Lock className="size-5" aria-hidden="true" />
              </span>
              <h2 className="text-lg font-extrabold">{te("lockedTitle")}</h2>
              <p className="max-w-sm text-sm text-muted-foreground">{te("lockedBody")}</p>
              <UnlockButton applicationId={appId} balance={balance} />
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ------------------------------------------------------------ open
  const { data, error } = await supabase.rpc("sponsor_get_candidate", {
    p_application_id: appId,
  });
  const c = data as Candidate | null;
  if (error || !c) notFound();
  const whatsapp = `https://wa.me/${c.phone.replace(/^\+/, "")}`;

  return (
    <div className="animate-in-fast mx-auto max-w-2xl space-y-5 pt-2">
      {back}
      <section className="shadow-float rounded-[2rem] bg-card p-5 sm:p-7">
        <h1 className="text-2xl font-extrabold tracking-tight break-words">{c.full_name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{shared}</p>
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

      {c.test.length ? (
        <section className="shadow-float rounded-3xl bg-card p-5">
          <h2 className="mb-3 text-xl font-extrabold">{t("testAnswers")}</h2>
          <dl className="divide-y">
            {c.test.map((q, i) => (
              <div key={i} className="py-3 first:pt-0 last:pb-0">
                <dt className="text-sm text-muted-foreground">
                  {i + 1}. {q.prompt}
                </dt>
                <dd className="mt-0.5 font-semibold whitespace-pre-line">{answerText(q)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

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
            <VideoViewer key={v.id} videoId={v.id} load={getCandidateVideoUrl} />
          ))}
        </section>
      ) : null}

      {c.survey.length ? (
        <section className="shadow-float rounded-3xl bg-card p-5">
          <h2 className="mb-3 text-xl font-extrabold">{t("answers")}</h2>
          <dl className="divide-y">
            {c.survey.map((q, i) => (
              <div key={i} className="py-3 first:pt-0 last:pb-0">
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
