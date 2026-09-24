"use client";

import { Check, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { saveTestAnswer, startTest, submitTest } from "@/actions/apply";
import { useStepAction } from "@/components/apply/use-step-action";
import { FormAlert } from "@/components/forms/form-alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ApplyView } from "@/server/public-application";
import type { Json } from "@/types/database";

type TestView = Extract<ApplyView, { stage: "test" }>;
type Answer = { options: number[] } | { text: string };

function fromSaved(value: Json | undefined): Answer | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  if (Array.isArray(value.options))
    return { options: value.options.filter((o) => typeof o === "number") };
  if (typeof value.text === "string") return { text: value.text };
  return undefined;
}

const isAnswered = (a: Answer | undefined) =>
  a ? ("options" in a ? a.options.length > 0 : a.text.trim().length > 0) : false;

function useCountdown(deadline: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [deadline]);
  return deadline ? Math.max(0, Math.floor((new Date(deadline).getTime() - now) / 1000)) : null;
}

export function TestStep({ jobId, view }: { jobId: string; view: TestView }) {
  const t = useTranslations("apply");
  const { run, pending, error } = useStepAction();

  if (!view.startedAt) {
    return (
      <div className="flex flex-1 flex-col">
        <h1 className="text-3xl font-extrabold tracking-tight">{t("testTitle")}</h1>
        <p className="mt-2 text-muted-foreground">
          {t("testIntro", { count: view.questions.length })}
        </p>
        <p className="mt-4 flex items-start gap-2 rounded-3xl bg-muted/60 p-4 text-sm">
          <Clock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          {view.timeLimitSeconds
            ? t("testTimed", { minutes: Math.ceil(view.timeLimitSeconds / 60) })
            : t("testUntimed")}
        </p>
        <div className="mt-auto space-y-3 pt-8">
          <FormAlert message={error} />
          <Button
            size="touch"
            className="w-full"
            disabled={pending}
            onClick={() => run(() => startTest(jobId))}
          >
            {t("startTest")}
          </Button>
        </div>
      </div>
    );
  }
  return <TestQuestions jobId={jobId} view={view} />;
}

function TestQuestions({ jobId, view }: { jobId: string; view: TestView }) {
  const t = useTranslations("apply");
  const { run, pending, error, setError } = useStepAction();
  const questions = view.questions;
  const [answers, setAnswers] = useState<Record<string, Answer | undefined>>(() =>
    Object.fromEntries(questions.map((q) => [q.id, fromSaved(view.answers[q.id])])),
  );
  const saved = useRef<Record<string, string>>(
    Object.fromEntries(questions.map((q) => [q.id, JSON.stringify(fromSaved(view.answers[q.id]))])),
  );
  const firstOpen = questions.findIndex((q) => !isAnswered(fromSaved(view.answers[q.id])));
  const [index, setIndex] = useState(firstOpen === -1 ? questions.length - 1 : firstOpen);
  const secondsLeft = useCountdown(view.deadline);
  const finishing = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);

  const q = questions[index];
  const answer = answers[q.id];
  const last = index === questions.length - 1;

  // Saves the current answer if it changed. Returns false if the server refused.
  const saveCurrent = useCallback(async () => {
    const current = answers[q.id];
    const key = JSON.stringify(current);
    if (!isAnswered(current) || saved.current[q.id] === key) return true;
    const okSave = await run(() => saveTestAnswer({ jobId, questionId: q.id, answer: current }), {
      refresh: false,
    });
    if (okSave) saved.current[q.id] = key;
    return okSave;
  }, [answers, jobId, q.id, run]);

  const finish = useCallback(
    async (auto = false) => {
      if (finishing.current) return;
      if (!auto) {
        const open = questions.filter((x) => !isAnswered(answers[x.id])).length;
        const message = open
          ? `${t("unanswered", { count: open })} ${t("finishConfirm")}`
          : t("finishConfirm");
        if (!window.confirm(message)) return;
        if (!(await saveCurrent())) return;
      }
      finishing.current = true;
      const done = await run(() => submitTest(jobId));
      if (!done) finishing.current = false;
    },
    [answers, jobId, questions, run, saveCurrent, t],
  );

  // Time is up: the server already refuses late answers, so just finish.
  useEffect(() => {
    if (secondsLeft === 0) {
      setError(t("timeUp"));
      void finish(true);
    }
  }, [secondsLeft, finish, setError, t]);

  useEffect(() => heading.current?.focus(), [index]);

  async function go(delta: number) {
    if (!(await saveCurrent())) return;
    setIndex((i) => Math.min(Math.max(i + delta, 0), questions.length - 1));
  }

  const setAnswer = (value: Answer) => setAnswers((a) => ({ ...a, [q.id]: value }));
  const selected = answer && "options" in answer ? answer.options : [];

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-muted-foreground">
          {t("questionOf", { current: index + 1, total: questions.length })}
        </p>
        {secondsLeft !== null ? (
          <p
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold tabular-nums",
              secondsLeft < 60 ? "bg-destructive/10 text-destructive" : "bg-muted",
            )}
            aria-live={secondsLeft < 60 ? "polite" : "off"}
          >
            <Clock className="size-4" aria-hidden="true" />
            <span className="sr-only">{t("timeLeft")}: </span>
            {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
          </p>
        ) : null}
      </div>

      <h1
        ref={heading}
        tabIndex={-1}
        className="mt-4 text-2xl font-extrabold tracking-tight outline-none"
      >
        {q.prompt}
      </h1>

      {q.type === "single_choice" || q.type === "multi_choice" ? (
        <fieldset className="mt-5 space-y-2.5">
          <legend className="mb-2 text-sm text-muted-foreground">
            {q.type === "single_choice" ? t("pickOne") : t("pickMany")}
          </legend>
          {q.options.map((option, oi) => {
            const on = selected.includes(oi);
            return (
              <label
                key={oi}
                className={cn(
                  "flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 font-semibold transition-colors",
                  on
                    ? "border-primary bg-primary/5"
                    : "border-transparent bg-muted/60 hover:bg-muted",
                )}
              >
                <input
                  type={q.type === "single_choice" ? "radio" : "checkbox"}
                  name={`q-${q.id}`}
                  checked={on}
                  onChange={() =>
                    setAnswer({
                      options:
                        q.type === "single_choice"
                          ? [oi]
                          : on
                            ? selected.filter((o) => o !== oi)
                            : [...selected, oi].sort(),
                    })
                  }
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center border-2 peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
                    q.type === "single_choice" ? "rounded-full" : "rounded-md",
                    on ? "border-primary bg-primary text-primary-foreground" : "border-border",
                  )}
                  aria-hidden="true"
                >
                  {on ? <Check className="size-4" /> : null}
                </span>
                {option}
              </label>
            );
          })}
        </fieldset>
      ) : (
        <div className="mt-5">
          <label htmlFor={`q-${q.id}`} className="sr-only">
            {t("writeAnswer")}
          </label>
          <textarea
            id={`q-${q.id}`}
            rows={q.type === "short_text" ? 3 : 7}
            maxLength={q.type === "short_text" ? 500 : 3000}
            value={answer && "text" in answer ? answer.text : ""}
            onChange={(e) => setAnswer({ text: e.target.value })}
            placeholder={t("writeAnswer")}
            className="w-full resize-y rounded-2xl border border-input bg-background px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
      )}

      <div className="mt-auto space-y-3 pt-8">
        <FormAlert message={error} />
        <div className="flex gap-3">
          {index > 0 ? (
            <Button variant="secondary" size="touch" disabled={pending} onClick={() => go(-1)}>
              {t("previous")}
            </Button>
          ) : null}
          {last ? (
            <Button size="touch" className="flex-1" disabled={pending} onClick={() => finish()}>
              {pending ? t("saving") : t("finishTest")}
            </Button>
          ) : (
            <Button size="touch" className="flex-1" disabled={pending} onClick={() => go(1)}>
              {pending ? t("saving") : t("next")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
