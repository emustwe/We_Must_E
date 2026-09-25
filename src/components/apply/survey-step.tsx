"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { submitApplication } from "@/actions/apply";
import { SectionTimer } from "@/components/apply/section-timer";
import { QuestionText } from "@/components/apply/question-text";
import { useStepAction } from "@/components/apply/use-step-action";
import { FormAlert } from "@/components/forms/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ApplyView, SurveyQuestionView } from "@/server/public-application";

type SurveyView = Extract<ApplyView, { stage: "survey" }>;
type Answer = { options: number[]; other?: string } | { text: string } | { number: number };
type Draft = { answers: Record<string, Answer> };

// "Other" options ask for a typed answer.
export const isOther = (label: string) => /^other\b/i.test(label.trim());

// Answers stay in this tab only (sessionStorage) until the applicant consents
// and sends them.
export const draftKey = (jobId: string) => `wm-apply-${jobId}`;
function loadDraft(jobId: string): Draft {
  try {
    const raw = sessionStorage.getItem(draftKey(jobId));
    if (raw) return { answers: (JSON.parse(raw) as Draft).answers ?? {} };
  } catch {
    // Storage blocked or corrupt: start empty.
  }
  return { answers: {} };
}

const otherPicked = (q: SurveyQuestionView, a: { options: number[] }) =>
  a.options.some((o) => isOther(q.options[o] ?? ""));

const answered = (q: SurveyQuestionView, a: Answer | undefined) =>
  !!a &&
  ("options" in a
    ? a.options.length > 0 && (!otherPicked(q, a) || Boolean(a.other?.trim()))
    : "text" in a
      ? a.text.trim().length > 0
      : Number.isFinite(a.number));

export function SurveyStep({ jobId, view }: { jobId: string; view: SurveyView }) {
  const t = useTranslations("apply");
  const tAll = useTranslations();
  const { run, pending, error, setError } = useStepAction();
  const [draft, setDraft] = useState<Draft>({ answers: {} });
  const [loaded, setLoaded] = useState(false);
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [consent, setConsent] = useState(false);
  const [consentMissing, setConsentMissing] = useState(false);

  useEffect(() => {
    // Restore this tab's draft after hydration (sessionStorage isn't available on the server).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(loadDraft(jobId));
    setLoaded(true);
  }, [jobId]);
  useEffect(() => {
    if (!loaded) return;
    try {
      sessionStorage.setItem(draftKey(jobId), JSON.stringify(draft));
    } catch {
      // Storage blocked: the draft just isn't kept across reloads.
    }
  }, [draft, jobId, loaded]);

  const questions = view.questions;
  const setAnswer = (id: string, value: Answer | undefined) => {
    setMissing((m) => {
      const next = new Set(m);
      next.delete(id);
      return next;
    });
    setDraft((d) => {
      const answers = { ...d.answers };
      if (value) answers[id] = value;
      else delete answers[id];
      return { ...d, answers };
    });
  };

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });

  // Check everything on the page, then send it all at once.
  async function submit() {
    setError(null);
    const open = questions.filter((q) => q.required && !answered(q, draft.answers[q.id]));
    setMissing(new Set(open.map((q) => q.id)));
    setConsentMissing(!consent);
    if (open.length) {
      setError(t("answerAll", { count: open.length }));
      return scrollTo(`s-card-${open[0].id}`);
    }
    if (!consent) {
      setError(tAll("validation.acceptConsent"));
      return scrollTo("consent");
    }
    const answers = Object.fromEntries(
      Object.entries(draft.answers)
        .filter(([id, a]) => {
          const q = questions.find((x) => x.id === id);
          return q && answered(q, a);
        })
        .map(([id, a]) => {
          // Keep the typed "Other" only when "Other" is picked.
          const q = questions.find((x) => x.id === id)!;
          if ("options" in a) {
            return [
              id,
              otherPicked(q, a)
                ? { options: a.options, other: a.other!.trim() }
                : { options: a.options },
            ];
          }
          return [id, a];
        }),
    );
    // On success the server redirects to the confirmation page, which clears the draft.
    await run(() => submitApplication({ jobId, answers, consent: true }), {
      refresh: false,
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <SectionTimer deadline={view.deadline} />
      <h1 className="text-3xl font-extrabold tracking-tight">{t("surveyTitle")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("surveyOnePage")}</p>

      {questions.length ? (
        <ol className="mt-4 space-y-4">
          {questions.map((q, i) => (
            <li
              key={q.id}
              id={`s-card-${q.id}`}
              className={cn(
                "scroll-mt-20 rounded-3xl border-2 p-4",
                missing.has(q.id)
                  ? "border-destructive/60"
                  : "border-transparent bg-white shadow-wm-1",
              )}
            >
              <QuestionCard
                question={q}
                number={i + 1}
                value={draft.answers[q.id]}
                onChange={(v) => setAnswer(q.id, v)}
              />
              {missing.has(q.id) ? (
                <p className="mt-2 text-sm font-medium text-destructive">{t("required")}</p>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}

      <section
        id="consent"
        className={cn(
          "mt-4 scroll-mt-20 rounded-3xl border-2 p-4",
          consentMissing && !consent
            ? "border-destructive/60"
            : "border-transparent bg-white shadow-wm-1",
        )}
      >
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="peer sr-only"
          />
          <span
            className={cn(
              "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border-2 peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
              consent
                ? "border-primary bg-primary text-primary-foreground"
                : "border-[#C3CBD7] bg-white",
            )}
            aria-hidden="true"
          >
            {consent ? <Check className="size-4" /> : null}
          </span>
          <span className="text-sm font-semibold">{t("consent")}</span>
        </label>
        <Link
          href="/privacy"
          target="_blank"
          className="mt-2 inline-block text-sm font-semibold text-primary hover:underline"
        >
          {t("privacyLink")}
        </Link>
      </section>

      <div className="mt-6 space-y-3 pb-2">
        <FormAlert message={error} />
        <Button size="touch" className="w-full" disabled={pending || !loaded} onClick={submit}>
          {pending ? t("saving") : t("submit")}
        </Button>
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  number,
  value,
  onChange,
}: {
  question: SurveyQuestionView;
  number: number;
  value: Answer | undefined;
  onChange: (value: Answer | undefined) => void;
}) {
  const t = useTranslations("apply");
  const selected = value && "options" in value ? value.options : [];
  return (
    <>
      <h2 className="sr-only">
        {number}. {question.prompt}
      </h2>
      <QuestionText number={number} prompt={question.prompt} aria-hidden />
      {question.required ? null : (
        <p className="mt-1 text-sm text-muted-foreground">({t("optional")})</p>
      )}
      {question.type === "single_choice" || question.type === "multi_choice" ? (
        <fieldset className="mt-3 space-y-2">
          <legend className="mb-2 text-sm text-muted-foreground">
            {question.type === "single_choice" ? t("pickOne") : t("pickMany")}
          </legend>
          {question.options.map((option, oi) => {
            const on = selected.includes(oi);
            return (
              <label
                key={oi}
                className={cn(
                  "flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 font-semibold transition-colors",
                  on
                    ? "border-primary bg-primary/5"
                    : "border-transparent bg-wm-mist hover:bg-wm-tint",
                )}
              >
                <input
                  type={question.type === "single_choice" ? "radio" : "checkbox"}
                  name={`s-${question.id}`}
                  checked={on}
                  onChange={() => {
                    const options =
                      question.type === "single_choice"
                        ? [oi]
                        : on
                          ? selected.filter((o) => o !== oi)
                          : [...selected, oi].sort();
                    const other = value && "options" in value ? value.other : undefined;
                    onChange(options.length ? { options, other } : undefined);
                  }}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center border-2 peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
                    question.type === "single_choice" ? "rounded-full" : "rounded-md",
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-[#C3CBD7] bg-white",
                  )}
                  aria-hidden="true"
                >
                  {on ? <Check className="size-4" /> : null}
                </span>
                {option}
              </label>
            );
          })}
          {value &&
          "options" in value &&
          value.options.some((o) => isOther(question.options[o] ?? "")) ? (
            <div className="pt-1">
              <Label htmlFor={`s-${question.id}-other`}>{t("otherLabel")}</Label>
              <Input
                id={`s-${question.id}-other`}
                className="mt-1.5 h-12 text-base"
                maxLength={300}
                value={value.other ?? ""}
                onChange={(e) => onChange({ options: value.options, other: e.target.value })}
              />
            </div>
          ) : null}
        </fieldset>
      ) : question.type === "scale" ? (
        <fieldset className="mt-5">
          <legend className="sr-only">{question.prompt}</legend>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((n) => {
              const on = value && "number" in value && value.number === n;
              return (
                <label
                  key={n}
                  className={cn(
                    "flex h-14 cursor-pointer items-center justify-center rounded-2xl border-2 text-lg font-bold",
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-transparent bg-wm-mist",
                  )}
                >
                  <input
                    type="radio"
                    name={`s-${question.id}`}
                    checked={Boolean(on)}
                    onChange={() => onChange({ number: n })}
                    className="sr-only"
                  />
                  {n}
                </label>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{t("scaleLow")}</span>
            <span>{t("scaleHigh")}</span>
          </div>
        </fieldset>
      ) : question.type === "number" ? (
        <div className="mt-5">
          <Label htmlFor={`s-${question.id}`} className="sr-only">
            {question.prompt}
          </Label>
          <Input
            id={`s-${question.id}`}
            type="number"
            inputMode="decimal"
            placeholder={t("numberPlaceholder")}
            className="h-12 text-base"
            value={value && "number" in value ? String(value.number) : ""}
            onChange={(e) =>
              onChange(e.target.value === "" ? undefined : { number: Number(e.target.value) })
            }
          />
        </div>
      ) : (
        <div className="mt-5">
          <Label htmlFor={`s-${question.id}`} className="sr-only">
            {question.prompt}
          </Label>
          <textarea
            id={`s-${question.id}`}
            rows={question.type === "short_text" ? 3 : 6}
            maxLength={3000}
            placeholder={t("answerPlaceholder")}
            value={value && "text" in value ? value.text : ""}
            onChange={(e) => onChange(e.target.value ? { text: e.target.value } : undefined)}
            className="w-full resize-y rounded-2xl border border-input bg-white px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
      )}
    </>
  );
}
