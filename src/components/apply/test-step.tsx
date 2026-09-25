"use client";

import { Check, Clock, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { saveTestAnswer, saveTestAnswers, startTest, submitTest } from "@/actions/apply";
import { mmss, useCountdown } from "@/components/apply/section-timer";
import { QuestionText } from "@/components/apply/question-text";
import { useStepAction } from "@/components/apply/use-step-action";
import { FormAlert } from "@/components/forms/form-alert";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { typingResult, type TypingStats } from "@/lib/typing";
import { cn } from "@/lib/utils";
import type { ApplyView } from "@/server/public-application";
import type { Json } from "@/types/database";

type TestView = Extract<ApplyView, { stage: "test" }>;
type Answer = { options: number[] } | { text: string; stats?: TypingStats };

function fromSaved(value: Json | undefined): Answer | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  if (Array.isArray(value.options))
    return { options: value.options.filter((o) => typeof o === "number") };
  if (typeof value.text === "string") {
    const st = value.stats;
    return st && typeof st === "object" && !Array.isArray(st)
      ? {
          text: value.text,
          stats: {
            seconds: Number(st.seconds) || 0,
            backspaces: Number(st.backspaces) || 0,
            keystrokes: Number(st.keystrokes) || 0,
          },
        }
      : { text: value.text };
  }
  return undefined;
}

// A finished typing test counts even if the time ran out before anything was typed.
const isAnswered = (a: Answer | undefined) =>
  a
    ? "options" in a
      ? a.options.length > 0
      : Boolean(a.stats) || a.text.trim().length > 0
    : false;

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
        <p className="mt-4 flex items-start gap-2 rounded-3xl bg-white p-5 text-sm shadow-wm-1">
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

// All questions on one page. Each answer is saved as it is given.
function TestQuestions({ jobId, view }: { jobId: string; view: TestView }) {
  const t = useTranslations("apply");
  const te = useTranslations("errors");
  const ask = useConfirm();
  const { run, pending, error, setError } = useStepAction();
  const questions = view.questions;
  const [answers, setAnswers] = useState<Record<string, Answer | undefined>>(() =>
    Object.fromEntries(questions.map((q) => [q.id, fromSaved(view.answers[q.id])])),
  );
  const [missing, setMissing] = useState<Set<string>>(new Set());
  // Answers given but not confirmed by the server yet (waiting or in flight).
  const [unsaved, setUnsaved] = useState<Set<string>>(new Set());
  const saved = useRef<Record<string, string>>(
    Object.fromEntries(questions.map((q) => [q.id, JSON.stringify(fromSaved(view.answers[q.id]))])),
  );
  const timers = useRef<Record<string, number>>({});
  const latest = useRef<Record<string, Answer | undefined>>({});
  const finishing = useRef(false);
  const secondsLeft = useCountdown(view.deadline);

  const saveOne = useCallback(
    async (questionId: string, answer: Answer | undefined) => {
      const key = JSON.stringify(answer);
      const settle = () =>
        setUnsaved((u) => {
          const next = new Set(u);
          next.delete(questionId);
          return next;
        });
      if (!isAnswered(answer) || saved.current[questionId] === key) return settle();
      const result = await saveTestAnswer({ jobId, questionId, answer });
      if (result.ok) {
        saved.current[questionId] = key;
        // A newer answer may have been given meanwhile; it saves on its own timer.
        if (JSON.stringify(latest.current[questionId]) === key) settle();
      } else setError(te(result.error));
    },
    [jobId, setError, te],
  );

  // Choices save at once, typing after a short pause.
  function setAnswer(questionId: string, answer: Answer, delay: number) {
    setAnswers((a) => ({ ...a, [questionId]: answer }));
    latest.current[questionId] = answer;
    setUnsaved((u) => new Set(u).add(questionId));
    setMissing((m) => {
      const next = new Set(m);
      next.delete(questionId);
      return next;
    });
    window.clearTimeout(timers.current[questionId]);
    timers.current[questionId] = window.setTimeout(() => void saveOne(questionId, answer), delay);
  }

  const finish = useCallback(
    async (auto = false) => {
      if (finishing.current) return;
      if (!auto) {
        const open = questions.filter((q) => !isAnswered(answers[q.id])).map((q) => q.id);
        if (open.length) {
          setMissing(new Set(open));
          setError(t("answerAll", { count: open.length }));
          document
            .getElementById(`q-${open[0]}`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
        const yes = await ask({
          title: t("finishTitle"),
          body: t("finishConfirm"),
          confirmLabel: t("finishTest"),
        });
        if (!yes) return;
      }
      finishing.current = true;
      if (auto) setError(t("timeUp"));
      Object.values(timers.current).forEach((id) => window.clearTimeout(id));
      // Save anything not saved yet (after the time limit the server keeps what it has).
      const unsaved = questions
        .filter(
          (q) => isAnswered(answers[q.id]) && saved.current[q.id] !== JSON.stringify(answers[q.id]),
        )
        .map((q) => ({ questionId: q.id, answer: answers[q.id]! }));
      if (unsaved.length && !auto) {
        const result = await saveTestAnswers({ jobId, answers: unsaved });
        if (!result.ok && result.error !== "timeExpired") {
          finishing.current = false;
          setError(te(result.error));
          return;
        }
      }
      const done = await run(() => submitTest(jobId));
      if (!done) finishing.current = false;
    },
    [answers, ask, jobId, questions, run, setError, t, te],
  );

  // Time is up: the server already refuses late answers, so just finish.
  useEffect(() => {
    if (secondsLeft !== 0) return;
    const id = window.setTimeout(() => void finish(true), 0);
    return () => window.clearTimeout(id);
  }, [secondsLeft, finish]);

  const answeredCount = questions.filter((q) => isAnswered(answers[q.id])).length;

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between gap-3 bg-background/95 px-4 py-2 backdrop-blur">
        <p className="text-sm font-semibold text-muted-foreground">
          {t("answeredOf", { done: answeredCount, total: questions.length })}
          <span className="ms-2 inline-flex items-center gap-1 text-xs" aria-live="polite">
            {unsaved.size ? (
              <>
                <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                {t("saving")}
              </>
            ) : answeredCount ? (
              t("saved")
            ) : null}
          </span>
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

      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{t("testTitle")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("testOnePage")}</p>

      <ol className="mt-5 space-y-4">
        {questions.map((q, i) => {
          const answer = answers[q.id];
          const selected = answer && "options" in answer ? answer.options : [];
          const flagged = missing.has(q.id);
          return (
            <li
              key={q.id}
              id={`q-${q.id}`}
              className={cn(
                "scroll-mt-20 rounded-3xl border-2 p-4",
                flagged ? "border-destructive/60" : "border-transparent bg-white shadow-wm-1",
              )}
            >
              <h2 className="sr-only">
                {i + 1}. {q.prompt}
              </h2>
              <QuestionText number={i + 1} prompt={q.prompt} aria-hidden />
              {q.type === "typing" ? (
                <TypingQuestion
                  paragraph={q.options[0] ?? ""}
                  seconds={q.timeLimitSeconds ?? 120}
                  answer={answer && "text" in answer ? answer : undefined}
                  onDone={(a) => setAnswer(q.id, a, 0)}
                />
              ) : q.type === "single_choice" || q.type === "multi_choice" ? (
                <fieldset className="mt-3 space-y-2">
                  <legend className="mb-1 text-xs text-muted-foreground">
                    {q.type === "single_choice" ? t("pickOne") : t("pickMany")}
                  </legend>
                  {q.options.map((option, oi) => {
                    const on = selected.includes(oi);
                    return (
                      <label
                        key={oi}
                        className={cn(
                          "flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-2.5 text-sm font-semibold transition-colors",
                          on
                            ? "border-primary bg-primary/5"
                            : "border-transparent bg-wm-mist hover:bg-wm-tint",
                        )}
                      >
                        <input
                          type={q.type === "single_choice" ? "radio" : "checkbox"}
                          name={`q-${q.id}`}
                          checked={on}
                          onChange={() =>
                            setAnswer(
                              q.id,
                              {
                                options:
                                  q.type === "single_choice"
                                    ? [oi]
                                    : on
                                      ? selected.filter((o) => o !== oi)
                                      : [...selected, oi].sort(),
                              },
                              300,
                            )
                          }
                          className="peer sr-only"
                        />
                        <span
                          className={cn(
                            "flex size-6 shrink-0 items-center justify-center border-2 peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
                            q.type === "single_choice" ? "rounded-full" : "rounded-md",
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
                </fieldset>
              ) : (
                <div className="mt-3">
                  <label htmlFor={`a-${q.id}`} className="sr-only">
                    {t("writeAnswer")}
                  </label>
                  <textarea
                    id={`a-${q.id}`}
                    rows={q.type === "short_text" ? 3 : 6}
                    maxLength={q.type === "short_text" ? 500 : 3000}
                    value={answer && "text" in answer ? answer.text : ""}
                    onChange={(e) => setAnswer(q.id, { text: e.target.value }, 900)}
                    placeholder={t("writeAnswer")}
                    className="w-full resize-y rounded-2xl border border-input bg-white px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </div>
              )}
              {flagged ? (
                <p className="mt-2 text-sm font-medium text-destructive">{t("required")}</p>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="mt-6 space-y-3 pb-2">
        <FormAlert message={error} />
        <Button size="touch" className="w-full" disabled={pending} onClick={() => finish()}>
          {pending ? t("saving") : t("finishTest")}
        </Button>
      </div>
    </div>
  );
}

// The typing test: the paragraph, its own timer (from Start), no pasting.
// Counts keystrokes and backspaces; speed, accuracy and wrong words come from
// comparing the text with the paragraph.
function TypingQuestion({
  paragraph,
  seconds,
  answer,
  onDone,
}: {
  paragraph: string;
  seconds: number;
  answer: { text: string; stats?: TypingStats } | undefined;
  onDone: (answer: { text: string; stats: TypingStats }) => void;
}) {
  const t = useTranslations("apply");
  const [phase, setPhase] = useState<"idle" | "typing" | "done">(answer?.stats ? "done" : "idle");
  const [text, setText] = useState(answer?.text ?? "");
  const [deadline, setDeadline] = useState<string | null>(null);
  const counts = useRef({ backspaces: 0, keystrokes: 0, started: 0 });
  const box = useRef<HTMLTextAreaElement>(null);
  const left = useCountdown(deadline);

  const finish = useCallback(
    (typed: string) => {
      const used = Math.min(seconds, Math.round((Date.now() - counts.current.started) / 1000));
      setPhase("done");
      onDone({
        text: typed,
        stats: {
          seconds: Math.max(1, used),
          backspaces: counts.current.backspaces,
          keystrokes: counts.current.keystrokes,
        },
      });
    },
    [onDone, seconds],
  );

  // Time up: what was typed so far is the answer.
  useEffect(() => {
    if (phase !== "typing" || left !== 0) return;
    const id = window.setTimeout(() => finish(text), 0);
    return () => window.clearTimeout(id);
  }, [left, phase, finish, text]);

  const result =
    phase === "done" && answer?.stats
      ? typingResult(paragraph, answer.text, answer.stats.seconds)
      : null;

  return (
    <div className="mt-3 space-y-3">
      <p className="text-sm text-muted-foreground">{t("typingIntro", { time: mmss(seconds) })}</p>
      <p
        className="rounded-2xl border border-input bg-wm-mist p-4 text-base leading-relaxed select-none"
        onCopy={(e) => e.preventDefault()}
      >
        {paragraph}
      </p>
      {phase === "idle" ? (
        <Button
          size="pill"
          onClick={() => {
            counts.current = { backspaces: 0, keystrokes: 0, started: Date.now() };
            setDeadline(new Date(Date.now() + seconds * 1000).toISOString());
            setPhase("typing");
            window.setTimeout(() => box.current?.focus(), 0);
          }}
        >
          {t("typingStart")}
        </Button>
      ) : null}
      {phase !== "idle" ? (
        <>
          {phase === "typing" && left !== null ? (
            <p className="text-sm font-bold tabular-nums">
              {t("typingLeft")}: {mmss(left)}
            </p>
          ) : null}
          <label htmlFor="typing-box" className="sr-only">
            {t("typingLabel")}
          </label>
          <textarea
            id="typing-box"
            ref={box}
            rows={6}
            maxLength={3000}
            value={phase === "done" && answer ? answer.text : text}
            readOnly={phase === "done"}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" || e.key === "Delete") counts.current.backspaces += 1;
              if (e.key.length === 1 || e.key === "Backspace" || e.key === "Enter")
                counts.current.keystrokes += 1;
            }}
            onPaste={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="w-full resize-y rounded-2xl border border-input bg-white px-4 py-3 text-base outline-none read-only:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          {phase === "typing" ? (
            <Button size="pill" variant="secondary" onClick={() => finish(text)}>
              {t("typingFinish")}
            </Button>
          ) : null}
          {result && answer?.stats ? (
            <p className="rounded-2xl bg-success/10 px-4 py-3 text-sm font-semibold" role="status">
              {t("typingDone")}:{" "}
              {t("typingStats", {
                wpm: result.wpm,
                accuracy: result.accuracy,
                backspaces: answer.stats.backspaces,
                wrong: result.wrongWords.length,
              })}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
