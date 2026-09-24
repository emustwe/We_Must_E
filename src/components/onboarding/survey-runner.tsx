"use client";

import { ArrowLeft, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { saveSurveyAnswer, startSurvey, submitSurvey } from "@/actions/onboarding";
import { FormAlert } from "@/components/forms/form-alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type SurveyQuestion = {
  id: string;
  type: "single_choice" | "multi_choice" | "short_text" | "long_text" | "number" | "scale";
  prompt: string;
  options: string[];
  required: boolean;
};
type Answer = string | number | string[];

const isEmpty = (a: Answer | undefined) =>
  a === undefined ||
  a === "" ||
  (Array.isArray(a) && a.length === 0) ||
  (typeof a === "number" && Number.isNaN(a));

export function SurveyRunner({
  started,
  submitted,
  questions,
  initialAnswers,
  nextHref,
}: {
  started: boolean;
  submitted: boolean;
  questions: SurveyQuestion[];
  initialAnswers: Record<string, Answer>;
  nextHref: string;
}) {
  const t = useTranslations("onboarding.survey");
  const to = useTranslations("onboarding");
  const te = useTranslations("errors");
  const router = useRouter();
  const [answers, setAnswers] = useState(initialAnswers);
  // Resume at the first unanswered question.
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      questions.findIndex((q) => isEmpty(initialAnswers[q.id])),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (submitted) {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-3 rounded-3xl bg-success/10 p-5">
          <Check className="mt-0.5 size-5 text-success" aria-hidden="true" />
          <div>
            <p className="font-bold">{t("doneTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("doneBody")}</p>
          </div>
        </div>
        <Link href={nextHref} className={cn(buttonVariants({ size: "touch" }), "w-full")}>
          {to("continue")}
        </Link>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="space-y-6">
        <FormAlert message={error} />
        <div className="rounded-3xl bg-muted/70 p-5 text-4xl" aria-hidden="true">
          📝
        </div>
        <Button
          size="touch"
          className="w-full"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await startSurvey();
              if (!result.ok) return setError(te(result.error));
              router.refresh();
            })
          }
        >
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {t("start")}
        </Button>
      </div>
    );
  }

  const question = questions[index];
  const answer = answers[question.id];
  const isLast = index === questions.length - 1;

  function next() {
    setError(null);
    if (isEmpty(answer)) {
      if (question.required) return setError(t("required"));
      if (!isLast) return setIndex(index + 1);
    }
    startTransition(async () => {
      if (!isEmpty(answer)) {
        const saved = await saveSurveyAnswer({ questionId: question.id, answer });
        if (!saved.ok) return setError(te(saved.error));
      }
      if (!isLast) return setIndex(index + 1);
      const result = await submitSurvey();
      if (!result.ok) return setError(te(result.error));
      router.push(nextHref);
    });
  }

  const set = (value: Answer) => setAnswers((prev) => ({ ...prev, [question.id]: value }));
  const scaleMax = question.options.length || 5;

  return (
    <div className="space-y-6">
      <p className="text-sm font-semibold text-muted-foreground">
        {t("question", { current: index + 1, total: questions.length })}
      </p>
      <h2 key={question.id} className="animate-in-fast text-xl leading-snug font-bold">
        {question.prompt}
      </h2>

      <div key={`${question.id}-input`} className="animate-in-fast">
        {question.type === "single_choice" || question.type === "multi_choice" ? (
          <div
            className="grid gap-2.5"
            role={question.type === "single_choice" ? "radiogroup" : "group"}
            aria-label={question.prompt}
          >
            {question.options.map((option) => {
              const selected =
                question.type === "single_choice"
                  ? answer === option
                  : Array.isArray(answer) && answer.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  role={question.type === "single_choice" ? "radio" : "checkbox"}
                  aria-checked={selected}
                  onClick={() => {
                    if (question.type === "single_choice") set(option);
                    else {
                      const list = Array.isArray(answer) ? answer : [];
                      set(selected ? list.filter((v) => v !== option) : [...list, option]);
                    }
                  }}
                  className={cn(
                    "flex min-h-14 items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 text-start text-base font-semibold transition-colors",
                    selected
                      ? "border-foreground bg-muted"
                      : "border-border bg-background hover:bg-muted/50",
                  )}
                >
                  {option}
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center border-2",
                      question.type === "single_choice" ? "rounded-full" : "rounded-md",
                      selected
                        ? "border-foreground bg-foreground text-background"
                        : "border-border",
                    )}
                    aria-hidden="true"
                  >
                    {selected ? <Check className="size-3.5" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {question.type === "short_text" ? (
          <Input
            value={typeof answer === "string" ? answer : ""}
            onChange={(e) => set(e.target.value)}
            placeholder={t("typeAnswer")}
            aria-label={question.prompt}
            maxLength={200}
          />
        ) : null}
        {question.type === "long_text" ? (
          <textarea
            value={typeof answer === "string" ? answer : ""}
            onChange={(e) => set(e.target.value)}
            rows={5}
            maxLength={4000}
            placeholder={t("typeAnswer")}
            aria-label={question.prompt}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        ) : null}
        {question.type === "number" ? (
          <Input
            type="number"
            inputMode="decimal"
            dir="ltr"
            value={typeof answer === "number" ? answer : ""}
            onChange={(e) => set(e.target.value === "" ? "" : Number(e.target.value))}
            aria-label={question.prompt}
          />
        ) : null}
        {question.type === "scale" ? (
          <div className="space-y-2">
            <div className="flex gap-2" role="radiogroup" aria-label={question.prompt}>
              {Array.from({ length: scaleMax }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={answer === n}
                  onClick={() => set(n)}
                  className={cn(
                    "h-14 flex-1 rounded-2xl border-2 text-lg font-bold",
                    answer === n
                      ? "border-foreground bg-foreground text-background"
                      : "border-border",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{question.options[0] ?? t("scaleLow")}</span>
              <span>{question.options[scaleMax - 1] ?? t("scaleHigh")}</span>
            </div>
          </div>
        ) : null}
      </div>

      <FormAlert message={error} />

      <div className="flex gap-3">
        {index > 0 ? (
          <Button
            type="button"
            variant="secondary"
            size="icon-touch"
            onClick={() => setIndex(index - 1)}
            aria-label={to("back")}
            className="size-12"
          >
            <ArrowLeft className="size-5 rtl:-scale-x-100" />
          </Button>
        ) : null}
        <Button type="button" size="touch" className="flex-1" onClick={next} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {isLast ? t("submit") : to("next")}
        </Button>
      </div>
    </div>
  );
}
