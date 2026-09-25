"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [verified, setVerified] = useState(!view.requireOtp);
  const [code, setCode] = useState("");
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
  const tr = (key?: string) =>
    key ? (tAll.has(key as never) ? tAll(key as never) : key) : undefined;

  const setContact = (field: keyof Draft["contact"], value: string) =>
    setDraft((d) => ({ ...d, contact: { ...d.contact, [field]: value } }));
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

  async function sendCode() {
    const parsed = contactSchema.shape.phone.safeParse(draft.contact.phone);
    if (!parsed.success) {
      setFieldErrors((f) => ({ ...f, phone: "validation.phoneInvalid" }));
      return;
    }
    const sent = await run(() => sendPhoneCode({ jobId, phone: draft.contact.phone }), {
      refresh: false,
    });
    if (sent) setCodeSentTo(parsed.data);
  }

  async function verify() {
    const ok = await run(() => verifyPhoneCode({ jobId, code }), { refresh: false });
    if (ok) setVerified(true);
  }

  // Check everything on the page, then send it all at once.
  async function submit() {
    setError(null);
    const contact = contactSchema.safeParse(draft.contact);
    const errors = contact.success
      ? {}
      : Object.fromEntries(contact.error.issues.map((i) => [String(i.path[0]), i.message]));
    setFieldErrors(errors);
    const open = questions.filter((q) => q.required && !answered(q, draft.answers[q.id]));
    setMissing(new Set(open.map((q) => q.id)));
    setConsentMissing(!consent);
    if (!contact.success) return scrollTo("contact");
    if (view.requireOtp && !verified) {
      setError(tAll("errors.phoneUnverified"));
      return scrollTo("contact");
    }
    if (open.length) {
      setError(t("answerAll", { count: open.length }));
      return scrollTo(`s-card-${open[0].id}`);
    }
    if (!consent) {
      setError(tAll("validation.acceptConsent"));
      return scrollTo("consent");
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

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="text-3xl font-extrabold tracking-tight">{t("surveyTitle")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("surveyOnePage")}</p>

      <section id="contact" className="mt-5 scroll-mt-20 space-y-4 rounded-3xl bg-muted/30 p-4">
        <h2 className="font-bold">{t("contactTitle")}</h2>
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
        {view.requireOtp && !verified ? (
          <div className="space-y-2">
            {codeSentTo ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {t("codeBody", { phone: codeSentTo })}
                </p>
                <TextField
                  id="code"
                  label={t("code")}
                  value={code}
                  onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
                <Button
                  type="button"
                  size="pill"
                  disabled={pending || code.length !== 6}
                  onClick={verify}
                >
                  {t("verify")}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="pill"
                variant="secondary"
                disabled={pending}
                onClick={sendCode}
              >
                {t("sendCode")}
              </Button>
            )}
          </div>
        ) : null}
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
      </section>

      {questions.length ? (
        <ol className="mt-4 space-y-4">
          {questions.map((q, i) => (
            <li
              key={q.id}
              id={`s-card-${q.id}`}
              className={cn(
                "scroll-mt-20 rounded-3xl border-2 p-4",
                missing.has(q.id) ? "border-destructive/60" : "border-transparent bg-muted/30",
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
          consentMissing && !consent ? "border-destructive/60" : "border-transparent bg-muted/30",
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
      <h2 className="font-bold">
        <span className="text-muted-foreground">{number}. </span>
        {question.prompt}
        {question.required ? null : (
          <span className="ms-1 text-sm font-normal text-muted-foreground">({t("optional")})</span>
        )}
      </h2>
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
