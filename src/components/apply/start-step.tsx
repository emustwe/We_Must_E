"use client";

import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { ClipboardCheck, ListChecks, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { startApplication } from "@/actions/apply";
import { Captcha, captchaEnabled } from "@/components/auth/captcha";
import { TrustLines } from "@/components/explore/job-explorer";
import { FormAlert } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { useStepAction } from "@/components/apply/use-step-action";

export function StartStep({ jobId }: { jobId: string }) {
  const t = useTranslations("apply");
  const te = useTranslations("errors");
  const { run, pending, error, setError } = useStepAction();
  const [captchaToken, setCaptchaToken] = useState<string>();
  const captchaRef = useRef<TurnstileInstance>(undefined);
  const items = [
    { icon: ListChecks, text: t("introTest") },
    { icon: Video, text: t("introVideo") },
    { icon: ClipboardCheck, text: t("introSurvey") },
  ];

  return (
    <form
      className="flex flex-1 flex-col"
      onSubmit={async (e) => {
        e.preventDefault();
        if (captchaEnabled && !captchaToken) {
          setError(te("captchaRequired"));
          return;
        }
        const started = await run(() => startApplication({ jobId, captchaToken }));
        if (!started) {
          captchaRef.current?.reset();
          setCaptchaToken(undefined);
        }
      }}
    >
      <h1 className="text-3xl font-extrabold tracking-tight">{t("introTitle")}</h1>
      <p className="mt-2 text-muted-foreground">{t("introBody")}</p>
      <ol className="mt-6 space-y-3">
        {items.map(({ icon: Icon, text }, i) => (
          <li key={text} className="flex items-center gap-3 rounded-3xl bg-muted/60 p-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-background">
              <Icon className="size-5 text-primary" aria-hidden="true" />
            </span>
            <span className="font-semibold">
              <span className="sr-only">{i + 1}. </span>
              {text}
            </span>
          </li>
        ))}
      </ol>
      <TrustLines className="mt-6 text-muted-foreground" />
      <div className="mt-auto space-y-3 pt-8">
        <FormAlert message={error} />
        <Captcha ref={captchaRef} onToken={setCaptchaToken} />
        <SubmitButton pending={pending}>{pending ? t("starting") : t("start")}</SubmitButton>
      </div>
    </form>
  );
}
