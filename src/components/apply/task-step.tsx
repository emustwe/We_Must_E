"use client";

import { CheckCircle2, FileText, Loader2, RotateCcw, Upload, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  confirmCv,
  createCvUpload,
  finishVideos,
  saveProfile,
  sendPhoneCode,
  verifyPhoneCode,
} from "@/actions/apply";
import { SectionTimer } from "@/components/apply/section-timer";
import { useStepAction } from "@/components/apply/use-step-action";
import {
  OneVideo,
  Recorder,
  uploadWithProgress,
  type VideoView,
} from "@/components/apply/video-step";
import { FormAlert } from "@/components/forms/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  basicProfileSchema,
  ENGLISH_LEVELS,
  fullProfileSchema,
  GENDERS,
} from "@/lib/validations/apply";

const MAX_CV_BYTES = 5 * 1024 * 1024;

type FieldKind = "text" | "tel" | "email" | "number" | "long" | "gender" | "english";
type Field = { name: string; kind: FieldKind; autoComplete?: string };

// Step 2: the applicant's profile, in the client's order. Practice jobs only
// ask for name, phone and email.
const FULL: { group: "personal" | "professional" | "additional"; fields: Field[] }[] = [
  {
    group: "personal",
    fields: [
      { name: "fullName", kind: "text", autoComplete: "name" },
      { name: "preferredName", kind: "text", autoComplete: "nickname" },
      { name: "age", kind: "number" },
      { name: "gender", kind: "gender" },
      { name: "country", kind: "text", autoComplete: "country-name" },
      { name: "city", kind: "text", autoComplete: "address-level2" },
      { name: "nationality", kind: "text" },
      { name: "phone", kind: "tel", autoComplete: "tel" },
      { name: "email", kind: "email", autoComplete: "email" },
      { name: "languages", kind: "text" },
      { name: "englishLevel", kind: "english" },
      { name: "otherLanguages", kind: "text" },
    ],
  },
  {
    group: "professional",
    fields: [
      { name: "previousEmployment", kind: "text", autoComplete: "organization" },
      { name: "previousPosition", kind: "text", autoComplete: "organization-title" },
      { name: "yearsExperience", kind: "number" },
      { name: "previousExperience", kind: "long" },
    ],
  },
  {
    group: "additional",
    fields: [
      { name: "whyInterested", kind: "long" },
      { name: "workEnvironment", kind: "long" },
      { name: "lookingFor", kind: "long" },
    ],
  },
];
const BASIC: Field[] = [
  { name: "fullName", kind: "text", autoComplete: "name" },
  { name: "phone", kind: "tel", autoComplete: "tel" },
  { name: "email", kind: "email", autoComplete: "email" },
];

type Values = Record<string, string>;
const draftKey = (jobId: string) => `wm-task-${jobId}`;

export function TaskStep({ jobId, view }: { jobId: string; view: VideoView }) {
  const t = useTranslations("apply");
  const tAll = useTranslations();
  const { run, pending, error, setError } = useStepAction();
  const fields = view.fullProfile ? FULL.flatMap((g) => g.fields) : BASIC;
  const [values, setValues] = useState<Values>(() =>
    Object.fromEntries(fields.map((f) => [f.name, String(view.profile?.[f.name] ?? "")])),
  );
  const [loaded, setLoaded] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [hasCv, setHasCv] = useState(view.hasCv);
  const [cvMissing, setCvMissing] = useState(false);
  const [recorded, setRecorded] = useState<Set<string>>(
    () => new Set(view.questions.filter((q) => q.recorded).map((q) => q.id)),
  );
  const [oneRecorded, setOneRecorded] = useState(view.recorded);
  const [videosMissing, setVideosMissing] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Phone codes (only when the site requires them).
  const [verified, setVerified] = useState(!view.requireOtp);
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");

  // Keep what was typed in this tab across reloads (the server has the saved copy).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(draftKey(jobId));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore after hydration
      if (raw) setValues((v) => ({ ...v, ...(JSON.parse(raw) as Values) }));
    } catch {
      // Storage blocked or corrupt.
    }
    setLoaded(true);
  }, [jobId]);
  useEffect(() => {
    if (!loaded) return;
    try {
      sessionStorage.setItem(draftKey(jobId), JSON.stringify(values));
    } catch {
      // Storage blocked.
    }
  }, [values, jobId, loaded]);
  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  const tr = (key?: string) =>
    key ? (tAll.has(key as never) ? tAll(key as never) : key) : undefined;
  const set = (name: string, value: string) => {
    setValues((v) => ({ ...v, [name]: value }));
    setFieldErrors((f) => {
      const next = { ...f };
      delete next[name];
      return next;
    });
    if (name === "phone" && view.requireOtp) setVerified(false);
  };
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  const onStream = (s: MediaStream) => {
    streamRef.current = s;
    setStream(s);
  };

  async function finish() {
    setError(null);
    // 1. Every profile field (checked again on the server).
    const schema = view.fullProfile ? fullProfileSchema : basicProfileSchema;
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[String(issue.path[0])] ??= issue.message;
      setFieldErrors(errs);
      setError(t("fixFields"));
      return scrollTo(`f-${Object.keys(errs)[0]}`);
    }
    if (view.requireOtp && !verified) {
      setError(tAll("errors.phoneUnverified"));
      return scrollTo("f-phone");
    }
    // 2. The CV.
    if (view.fullProfile && !hasCv) {
      setCvMissing(true);
      setError(t("cvRequired"));
      return scrollTo("cv");
    }
    // 3. Every video.
    const missing =
      view.mode === "questions" ? view.questions.filter((q) => !recorded.has(q.id)) : [];
    if (missing.length || (view.mode === "one" && view.prompts.length && !oneRecorded)) {
      setVideosMissing(true);
      setError(t("videosRequired", { count: missing.length || 1 }));
      return scrollTo(missing.length ? `v-${missing[0].id}` : "videos");
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    await run(async () => {
      const saved = await saveProfile({ jobId, profile: values });
      if (!saved.ok) {
        if (saved.fieldErrors) setFieldErrors(saved.fieldErrors);
        return saved;
      }
      return finishVideos(jobId);
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <SectionTimer deadline={view.deadline} />
      <h1 className="text-3xl font-extrabold tracking-tight">{t("taskTitle")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("taskIntro")}</p>

      {view.fullProfile ? (
        FULL.map((g) => (
          <section key={g.group} className="mt-5 space-y-4 rounded-3xl bg-muted/30 p-4">
            <h2 className="font-bold">{t(`profileGroup.${g.group}`)}</h2>
            {g.fields.map((f) => (
              <ProfileField
                key={f.name}
                field={f}
                value={values[f.name] ?? ""}
                error={tr(fieldErrors[f.name])}
                onChange={(v) => set(f.name, v)}
              />
            ))}
            {g.group === "professional" ? (
              <CvUpload
                jobId={jobId}
                hasCv={hasCv}
                missing={cvMissing && !hasCv}
                onUploaded={() => {
                  setHasCv(true);
                  setCvMissing(false);
                }}
              />
            ) : null}
          </section>
        ))
      ) : (
        <section className="mt-5 space-y-4 rounded-3xl bg-muted/30 p-4">
          <h2 className="font-bold">{t("contactTitle")}</h2>
          {BASIC.map((f) => (
            <ProfileField
              key={f.name}
              field={f}
              optional={f.name === "email"}
              value={values[f.name] ?? ""}
              error={tr(fieldErrors[f.name])}
              onChange={(v) => set(f.name, v)}
            />
          ))}
        </section>
      )}

      {view.requireOtp && !verified ? (
        <div className="mt-3 space-y-2 rounded-3xl bg-muted/30 p-4">
          {codeSentTo ? (
            <>
              <p className="text-sm text-muted-foreground">
                {t("codeBody", { phone: codeSentTo })}
              </p>
              <Label htmlFor="f-code">{t("code")}</Label>
              <Input
                id="f-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                className="h-12 text-base"
              />
              <Button
                size="pill"
                disabled={pending || code.length !== 6}
                onClick={async () => {
                  if (await run(() => verifyPhoneCode({ jobId, code }), { refresh: false }))
                    setVerified(true);
                }}
              >
                {t("verify")}
              </Button>
            </>
          ) : (
            <Button
              size="pill"
              variant="secondary"
              disabled={pending}
              onClick={async () => {
                if (
                  await run(() => sendPhoneCode({ jobId, phone: values.phone }), { refresh: false })
                )
                  setCodeSentTo(values.phone);
              }}
            >
              {t("sendCode")}
            </Button>
          )}
        </div>
      ) : null}

      <section id="videos" className="mt-6 scroll-mt-20">
        <h2 className="text-xl font-extrabold">{t("videosTitle")}</h2>
        {view.mode === "questions" ? (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("videosIntro", { count: view.questions.length })}
            </p>
            <ol className="mt-4 space-y-3">
              {view.questions.map((q, i) => {
                const done = recorded.has(q.id);
                return (
                  <li
                    key={q.id}
                    id={`v-${q.id}`}
                    className={cn(
                      "scroll-mt-20 rounded-3xl border-2 p-4",
                      videosMissing && !done
                        ? "border-destructive/60"
                        : "border-transparent bg-muted/30",
                    )}
                  >
                    <p className="text-xs font-bold text-muted-foreground">
                      {t("videoQuestionOf", { current: i + 1, total: view.questions.length })} ·{" "}
                      {t("upToSeconds", { seconds: q.maxSeconds })}
                    </p>
                    <h3 className="mt-1 font-bold whitespace-pre-line">{q.prompt}</h3>
                    {open === q.id ? (
                      <Recorder
                        jobId={jobId}
                        compact
                        questionId={q.id}
                        question={q}
                        header={null}
                        stream={stream}
                        onStream={onStream}
                        onDone={() => {
                          setRecorded((r) => new Set(r).add(q.id));
                          setOpen(null);
                        }}
                      />
                    ) : (
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        {done ? (
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-success">
                            <CheckCircle2 className="size-4" aria-hidden="true" />
                            {t("videoSaved")}
                          </span>
                        ) : null}
                        <Button
                          size="pill"
                          variant={done ? "secondary" : "default"}
                          onClick={() => setOpen(q.id)}
                        >
                          {done ? (
                            <RotateCcw className="size-4" aria-hidden="true" />
                          ) : (
                            <Video className="size-4" aria-hidden="true" />
                          )}
                          {done ? t("retake") : t("recordAnswer")}
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </>
        ) : view.prompts.length ? (
          <div className="mt-3">
            <OneVideo
              jobId={jobId}
              view={view}
              stream={stream}
              onStream={onStream}
              onRecorded={() => setOneRecorded(true)}
            />
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">{t("noVideos")}</p>
        )}
      </section>

      <div className="mt-6 space-y-3 pb-2">
        <FormAlert message={error} />
        <Button size="touch" className="w-full" disabled={pending || !loaded} onClick={finish}>
          {pending ? t("saving") : t("continue")}
        </Button>
      </div>
    </div>
  );
}

function ProfileField({
  field,
  value,
  error,
  optional = false,
  onChange,
}: {
  field: Field;
  value: string;
  error?: string;
  optional?: boolean;
  onChange: (value: string) => void;
}) {
  const t = useTranslations("apply");
  const id = `f-${field.name}`;
  const label = `${t(`profile.${field.name}` as never)}${optional ? ` (${t("optional")})` : ""}`;
  const hint = t.has(`profileHint.${field.name}` as never)
    ? t(`profileHint.${field.name}` as never)
    : undefined;
  const common = {
    id,
    "aria-invalid": Boolean(error),
    "aria-describedby": error || hint ? `${id}-note` : undefined,
  };
  const inputClass = "h-12 text-base";
  return (
    <div className="scroll-mt-24 space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {field.kind === "gender" || field.kind === "english" ? (
        <select
          {...common}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-full rounded-xl border border-input bg-background px-3 text-base"
        >
          <option value="">{t("choose")}</option>
          {(field.kind === "gender" ? GENDERS : ENGLISH_LEVELS).map((o) => (
            <option key={o} value={o}>
              {t(`${field.kind === "gender" ? "genderOption" : "englishOption"}.${o}` as never)}
            </option>
          ))}
        </select>
      ) : field.kind === "long" ? (
        <textarea
          {...common}
          rows={4}
          maxLength={2000}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full resize-y rounded-2xl border border-input bg-background px-4 py-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      ) : (
        <Input
          {...common}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type={field.kind === "number" ? "text" : field.kind}
          inputMode={field.kind === "number" ? "numeric" : field.kind === "tel" ? "tel" : undefined}
          autoComplete={field.autoComplete}
          maxLength={200}
          className={inputClass}
        />
      )}
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

function CvUpload({
  jobId,
  hasCv,
  missing,
  onUploaded,
}: {
  jobId: string;
  hasCv: boolean;
  missing: boolean;
  onUploaded: () => void;
}) {
  const t = useTranslations("apply");
  const te = useTranslations("errors");
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    const lower = file.name.toLowerCase();
    const kind = lower.endsWith(".pdf") ? "pdf" : lower.endsWith(".docx") ? "docx" : null;
    if (!kind) return setError(t("cvType"));
    if (file.size > MAX_CV_BYTES) return setError(t("cvTooBig"));
    setBusy(true);
    setProgress(0);
    try {
      const target = await createCvUpload({ jobId, kind });
      if (!target.ok) throw new Error(target.error);
      await uploadWithProgress(target.data.signedUrl, file, setProgress);
      const confirmed = await confirmCv({ jobId, path: target.data.path });
      if (!confirmed.ok) throw new Error(confirmed.error);
      setName(file.name);
      onUploaded();
    } catch (e) {
      const key = e instanceof Error ? e.message : "";
      setError(
        ["rateLimited", "sessionExpired", "invalidFile"].includes(key)
          ? te(key as "invalidFile")
          : t("uploadFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      id="cv"
      className={cn(
        "scroll-mt-24 space-y-2 rounded-2xl border-2 p-3",
        missing ? "border-destructive/60" : "border-dashed border-border",
      )}
    >
      <p className="text-sm font-medium">{t("cvLabel")}</p>
      <p className="text-sm text-muted-foreground">{t("cvHint")}</p>
      {hasCv ? (
        <p className="flex items-center gap-1.5 text-sm font-semibold text-success">
          <FileText className="size-4" aria-hidden="true" />
          {name ?? t("cvSaved")}
        </p>
      ) : null}
      <input
        ref={input}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="sr-only"
        aria-label={t("cvLabel")}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        size="pill"
        variant="secondary"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Upload className="size-4" aria-hidden="true" />
        )}
        {busy ? t("uploading", { percent: progress }) : hasCv ? t("cvReplace") : t("cvUpload")}
      </Button>
      <FormAlert message={error} />
    </div>
  );
}
