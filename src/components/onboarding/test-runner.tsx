"use client";

import { Check, Clock, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { saveTestAnswer, startTest, submitTest } from "@/actions/onboarding";
import { FormAlert } from "@/components/forms/form-alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TestQuestion = { id: string; prompt: string; options: string[] };

export function TestRunner({
  attempt,
  questions,
  deadline,
  serverNow,
  nextHref,
}: {
  attempt: { id: string; submitted: boolean; answers: Record<string, number> } | null;
  questions: TestQuestion[];
  /** Epoch ms when the server stops accepting answers. */
  deadline: number | null;
  /** Server clock at render, to correct for a wrong phone clock. */
  serverNow: number;
  nextHref: string;
}) {
  const t = useTranslations("onboarding.test");
  const to = useTranslations("onboarding");
  const te = useTranslations("errors");
  const router = useRouter();
  const [answers, setAnswers] = useState(attempt?.answers ?? {});
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Difference between the server and phone clocks, measured after mount.
  const skew = useRef(0);
  useEffect(() => {
    skew.current = serverNow - Date.now();
  }, [serverNow]);
  const [remaining, setRemaining] = useState(() => (deadline ? deadline - serverNow : 0));
  const submitting = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const finish = useCallback(() => {
    if (!attempt || submitting.current) return;
    submitting.current = true;
    setIsSubmitting(true);
    startTransition(async () => {
      const result = await submitTest(attempt.id);
      if (!result.ok) {
        submitting.current = false;
        setIsSubmitting(false);
        return setError(te(result.error));
      }
      router.push(nextHref);
    });
  }, [attempt, nextHref, router, te]);

  // Countdown; submit automatically when time is up.
  useEffect(() => {
    if (!deadline || attempt?.submitted) return;
    const tick = () => {
      const left = deadline - (Date.now() + skew.current);
      setRemaining(left);
      if (left <= 0) finish();
    };
    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [deadline, attempt?.submitted, finish]);

  if (attempt?.submitted) {
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

  if (!attempt) {
    return (
      <div className="space-y-6">
        <FormAlert message={error} />
        <ul className="space-y-3">
          {[t("rule1"), t("rule2"), t("rule3")].map((rule, i) => (
            <li
              key={rule}
              className="flex gap-3 rounded-2xl bg-muted/70 p-4 text-sm leading-relaxed"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-background font-bold text-primary">
                {i + 1}
              </span>
              {rule}
            </li>
          ))}
        </ul>
        <Button
          size="touch"
          className="w-full"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await startTest();
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
  const seconds = Math.max(0, Math.ceil(remaining / 1000));
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const low = seconds <= 30;

  function choose(option: number) {
    setError(null);
    setAnswers((prev) => ({ ...prev, [question.id]: option }));
    startTransition(async () => {
      const result = await saveTestAnswer({
        attemptId: attempt!.id,
        questionId: question.id,
        option,
      });
      if (!result.ok) setError(te(result.error));
    });
  }

  return (
    <div className="space-y-6">
      <div
        className={cn(
          "sticky top-[5.5rem] z-10 flex items-center justify-between rounded-2xl px-4 py-3",
          low ? "bg-destructive/10 text-destructive" : "bg-muted",
        )}
        role="timer"
        aria-live={low ? "assertive" : "off"}
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Clock className="size-4" aria-hidden="true" />
          {t("timeLeft")}
        </span>
        <span className="font-mono text-lg font-bold tabular-nums">{clock}</span>
      </div>

      {seconds <= 0 ? <FormAlert tone="success" message={t("timeUp")} /> : null}

      <p className="text-sm font-semibold text-muted-foreground">
        {t("question", { current: index + 1, total: questions.length })}
      </p>
      <h2 key={question.id} className="animate-in-fast text-xl leading-snug font-bold">
        {question.prompt}
      </h2>
      <div className="grid gap-2.5" role="radiogroup" aria-label={question.prompt}>
        {question.options.map((option, i) => {
          const selected = answers[question.id] === i;
          return (
            <button
              key={`${question.id}-${i}`}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={seconds <= 0}
              onClick={() => choose(i)}
              className={cn(
                "flex min-h-14 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-start text-base font-semibold transition-colors",
                selected ? "border-foreground bg-muted" : "border-border hover:bg-muted/50",
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs",
                  selected ? "border-foreground bg-foreground text-background" : "border-border",
                )}
                aria-hidden="true"
              >
                {String.fromCharCode(65 + i)}
              </span>
              {option}
            </button>
          );
        })}
      </div>

      <FormAlert message={error} />

      <div className="flex flex-wrap justify-center gap-2" aria-hidden="true">
        {questions.map((q, i) => (
          <button
            key={q.id}
            type="button"
            tabIndex={-1}
            onClick={() => setIndex(i)}
            className={cn(
              "size-3 rounded-full",
              i === index
                ? "bg-foreground"
                : answers[q.id] !== undefined
                  ? "bg-success"
                  : "bg-muted",
            )}
          />
        ))}
      </div>

      <div className="flex gap-3">
        {index > 0 ? (
          <Button variant="secondary" size="touch" onClick={() => setIndex(index - 1)}>
            {to("back")}
          </Button>
        ) : null}
        {index < questions.length - 1 ? (
          <Button size="touch" className="flex-1" onClick={() => setIndex(index + 1)}>
            {to("next")}
          </Button>
        ) : (
          <Button
            size="touch"
            className="flex-1"
            disabled={isSubmitting}
            onClick={() => window.confirm(t("submitConfirm")) && finish()}
          >
            {t("submit")}
          </Button>
        )}
      </div>
    </div>
  );
}
