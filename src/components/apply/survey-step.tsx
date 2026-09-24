"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { sendPhoneCode, submitApplication, verifyPhoneCode } from "@/actions/apply";
import { useStepAction } from "@/components/apply/use-step-action";
import { FormAlert } from "@/components/forms/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { contactSchema } from "@/lib/validations/apply";
import type { ApplyView, SurveyQuestionView } from "@/server/public-application";

type SurveyView = Extract<ApplyView, { stage: "survey" }>;
type Answer = { options: number[] } | { text: string } | { number: number };
type Draft = {
  contact: { fullName: string; phone: string; email: string };
  answers: Record<string, Answer>;
};

// Answers stay in this tab only (sessionStorage) until the applicant consents
// and sends them; nothing personal reaches the server before that.
export const draftKey = (jobId: string) => `wm-apply-${jobId}`;
function loadDraft(jobId: string): Draft {
  try {
    const raw = sessionStorage.getItem(draftKey(jobId));
    if (raw) return JSON.parse(raw) as Draft;
  } catch {
    // Storage blocked or corrupt: start empty.
  }
  return { contact: { fullName: "", phone: "", email: "" }, answers: {} };
}

const answered = (q: SurveyQuestionView, a: Answer | undefined) =>
  !!a &&
  ("options" in a
    ? a.options.length > 0
    : "text" in a
      ? a.text.trim().length > 0
      : Number.isFinite(a.number));

export function SurveyStep({ jobId, view }: { jobId: string; view: SurveyView }) {
  const t = useTranslations("apply");
  const tAll = useTranslations();
  const { run, pending, error, setError } = useStepAction();
  const [draft, setDraft] = useState<Draft>({
    contact: { fullName: "", phone: "", email: "" },
    answers: {},
  });
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [verified, setVerified] = useState(!view.requireOtp);
  const [code, setCode] = useState("");
  const [consent, setConsent] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

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
  useEffect(() => heading.current?.focus(), [screen]);

  const questions = view.questions;
  // Screens: contact, [phone code], each question, consent.
  const codeScreen = view.requireOtp ? 1 : null;
  const firstQuestion = view.requireOtp ? 2 : 1;
  const consentScreen = firstQuestion + questions.length;
  const question =
    screen >= firstQuestion && screen < consentScreen ? questions[screen - firstQuestion] : null;

  const tr = (key?: string) =>
    key ? (tAll.has(key as never) ? tAll(key as never) : key) : undefined;

  async function next() {
    setError(null);
    if (screen === 0) {
      const parsed = contactSchema.safeParse(draft.contact);
      if (!parsed.success) {
        setFieldErrors(
          Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])),
        );
        return;
      }
      setFieldErrors({});
      if (view.requireOtp && !verified) {
        const sent = await run(() => sendPhoneCode({ jobId, phone: draft.contact.phone }), {
          refresh: false,
        });
        if (!sent) return;
        setCodeSentTo(parsed.data.phone);
      }
      setScreen(view.requireOtp && !verified ? 1 : firstQuestion);
      return;
    }
    if (screen === codeScreen) {
      const ok = await run(() => verifyPhoneCode({ jobId, code }), { refresh: false });
      if (!ok) return;
      setVerified(true);
      setScreen(firstQuestion);
      return;
    }
    if (question && question.required && !answered(question, draft.answers[question.id])) {
      setError(t("required"));
      return;
    }
    setScreen((s) => s + 1);
  }

  function back() {
    setError(null);
    setScreen((s) => (s === firstQuestion && verified && codeScreen ? 0 : Math.max(0, s - 1)));
  }

  async function submit() {
    if (!consent) {
      setError(tAll("validation.acceptConsent"));
      return;
    }
    const answers = Object.fromEntries(
      Object.entries(draft.answers).filter(([id, a]) => {
        const q = questions.find((x) => x.id === id);
        return q && answered(q, a);
      }),
    );
    // On success the server redirects to the confirmation page, which clears the draft.
    await run(() => submitApplication({ jobId, contact: draft.contact, answers, consent: true }), {
      refresh: false,
    });
  }

  const setContact = (field: keyof Draft["contact"], value: string) =>
    setDraft((d) => ({ ...d, contact: { ...d.contact, [field]: value } }));
  const setAnswer = (id: string, value: Answer | undefined) =>
    setDraft((d) => {
      const answers = { ...d.answers };
      if (value) answers[id] = value;
      else delete answers[id];
      return { ...d, answers };
    });

  return (
    <div className="flex flex-1 flex-col">
      {screen === 0 ? (
        <>
          <h1
            ref={heading}
            tabIndex={-1}
            className="text-3xl font-extrabold tracking-tight outline-none"
          >
            {t("contactTitle")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("contactBody")}</p>
          <div className="mt-6 space-y-4">
            <TextField
              id="fullName"
              label={t("fullName")}
              value={draft.contact.fullName}
              onChange={(v) => setContact("fullName", v)}
              autoComplete="name"
              error={tr(fieldErrors.fullName)}
            />
            <TextField
              id="phone"
              label={t("phone")}
              hint={t("phoneHint")}
              value={draft.contact.phone}
              onChange={(v) => {
                setContact("phone", v);
                if (view.requireOtp) setVerified(false);
              }}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              error={tr(fieldErrors.phone)}
            />
            <TextField
              id="email"
              label={`${t("email")} (${t("optional")})`}
              value={draft.contact.email}
              onChange={(v) => setContact("email", v)}
              type="email"
              inputMode="email"
              autoComplete="email"
              error={tr(fieldErrors.email)}
            />
          </div>
        </>
      ) : null}

      {screen === codeScreen ? (
        <>
          <h1
            ref={heading}
            tabIndex={-1}
            className="text-3xl font-extrabold tracking-tight outline-none"
          >
            {t("codeTitle")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("codeBody", { phone: codeSentTo ?? "" })}</p>
          <div className="mt-6">
            <TextField
              id="code"
              label={t("code")}
              value={code}
              onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
            />
          </div>
        </>
      ) : null}

      {question ? (
        <QuestionScreen
          key={question.id}
          headingRef={heading}
          question={question}
          number={screen - firstQuestion + 1}
          total={questions.length}
          value={draft.answers[question.id]}
          onChange={(v) => setAnswer(question.id, v)}
        />
      ) : null}

      {screen === consentScreen ? (
        <>
          <h1
            ref={heading}
            tabIndex={-1}
            className="text-3xl font-extrabold tracking-tight outline-none"
          >
            {t("consentTitle")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("consentBody")}</p>
          <dl className="mt-5 space-y-1 rounded-3xl bg-muted/60 p-4 text-sm">
            <div className="flex gap-2">
              <dt className="text-muted-foreground">{t("fullName")}:</dt>
              <dd className="font-semibold">{draft.contact.fullName}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground">{t("phone")}:</dt>
              <dd className="font-semibold" dir="ltr">
                {draft.contact.phone}
              </dd>
            </div>
            {draft.contact.email ? (
              <div className="flex gap-2">
                <dt className="text-muted-foreground">{t("email")}:</dt>
                <dd className="font-semibold">{draft.contact.email}</dd>
              </div>
            ) : null}
          </dl>
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-3xl border-2 p-4">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="peer sr-only"
            />
            <span
              className={cn(
                "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border-2 peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
                consent ? "border-primary bg-primary text-primary-foreground" : "border-border",
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
            className="mt-2 text-sm font-semibold text-primary hover:underline"
          >
            {t("privacyLink")}
          </Link>
        </>
      ) : null}

      <div className="mt-auto space-y-3 pt-8">
        <FormAlert message={error} />
        <div className="flex gap-3">
          {screen > 0 ? (
            <Button variant="secondary" size="touch" disabled={pending} onClick={back}>
              {t("previous")}
            </Button>
          ) : null}
          {screen === consentScreen ? (
            <Button size="touch" className="flex-1" disabled={pending} onClick={submit}>
              {pending ? t("saving") : t("submit")}
            </Button>
          ) : (
            <Button size="touch" className="flex-1" disabled={pending || !loaded} onClick={next}>
              {screen === codeScreen ? t("verify") : t("next")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function TextField({
  id,
  label,
  hint,
  error,
  value,
  onChange,
  ...props
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
} & Omit<React.ComponentProps<typeof Input>, "id" | "value" | "onChange">) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? `${id}-note` : undefined}
        className="h-12 text-base"
        {...props}
      />
      {error || hint ? (
        <p
          id={`${id}-note`}
          className={cn(
            "text-sm",
            error ? "font-medium text-destructive" : "text-muted-foreground",
          )}
        >
          {error ?? hint}
        </p>
      ) : null}
    </div>
  );
}

function QuestionScreen({
  question,
  number,
  total,
  value,
  onChange,
  headingRef,
}: {
  question: SurveyQuestionView;
  number: number;
  total: number;
  value: Answer | undefined;
  onChange: (value: Answer | undefined) => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const t = useTranslations("apply");
  const selected = value && "options" in value ? value.options : [];
  return (
    <>
      <p className="text-sm font-semibold text-muted-foreground">
        {t("questionOf", { current: number, total })}
        {question.required ? "" : ` · ${t("optional")}`}
      </p>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-2 text-2xl font-extrabold tracking-tight outline-none"
      >
        {question.prompt}
      </h1>
      {question.type === "single_choice" || question.type === "multi_choice" ? (
        <fieldset className="mt-5 space-y-2.5">
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
                    : "border-transparent bg-muted/60 hover:bg-muted",
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
                    onChange(options.length ? { options } : undefined);
                  }}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center border-2 peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
                    question.type === "single_choice" ? "rounded-full" : "rounded-md",
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
                      : "border-transparent bg-muted/60",
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
            className="w-full resize-y rounded-2xl border border-input bg-background px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
      )}
    </>
  );
}
