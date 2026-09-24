"use client";

import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition, type BaseSyntheticEvent } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { captchaEnabled } from "@/components/auth/captcha";
import type { ActionResult } from "@/lib/result";

type AuthAction = (input: unknown) => Promise<ActionResult>;

// Shared submit flow for the auth forms: client validation (react-hook-form +
// Zod), captcha token, pending state, and server errors mapped onto fields.
// Successful actions usually redirect; onSuccess covers the ones that don't.
export function useAuthSubmit<TValues extends FieldValues>(
  form: UseFormReturn<TValues>,
  action: AuthAction,
  { onSuccess, withCaptcha = true }: { onSuccess?: () => void; withCaptcha?: boolean } = {},
) {
  const t = useTranslations("errors");
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string>();
  const captchaRef = useRef<TurnstileInstance>(undefined);

  function onValid(values: TValues) {
    const needsCaptcha = withCaptcha && captchaEnabled;
    if (needsCaptcha && !captchaToken) {
      setFormError(t("captchaRequired"));
      return;
    }
    setFormError(null);
    startTransition(async () => {
      const result = await action(withCaptcha ? { ...values, captchaToken } : values);
      if (!result) return;
      if (result.ok) {
        onSuccess?.();
        return;
      }
      setFormError(t(result.error));
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        form.setError(field as Path<TValues>, { message }, { shouldFocus: true });
      }
      // Turnstile tokens are single-use.
      captchaRef.current?.reset();
      setCaptchaToken(undefined);
    });
  }

  // handleSubmit is created inside the event handler so render never touches the ref.
  function submit(event: BaseSyntheticEvent) {
    return form.handleSubmit(onValid)(event);
  }

  return {
    submit,
    pending,
    formError,
    captcha: { ref: captchaRef, onToken: setCaptchaToken },
  };
}
