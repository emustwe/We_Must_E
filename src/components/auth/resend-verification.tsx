"use client";

import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { resendVerification } from "@/actions/auth";
import { Captcha, captchaEnabled } from "@/components/auth/captcha";
import { FormAlert } from "@/components/forms/form-alert";
import { Button } from "@/components/ui/button";

const COOLDOWN_SECONDS = 60;

export function ResendVerification() {
  const t = useTranslations("verify");
  const te = useTranslations("errors");
  const [pending, startTransition] = useTransition();
  // Start in cooldown: the first email was just sent.
  const [secondsLeft, setSecondsLeft] = useState(COOLDOWN_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string>();
  const captchaRef = useRef<TurnstileInstance>(undefined);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  function resend() {
    if (captchaEnabled && !captchaToken) {
      setError(te("captchaRequired"));
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await resendVerification({ captchaToken });
      captchaRef.current?.reset();
      setCaptchaToken(undefined);
      if (!result.ok) {
        setError(te(result.error));
        return;
      }
      toast.success(t("resent"));
      setSecondsLeft(COOLDOWN_SECONDS);
    });
  }

  return (
    <div className="space-y-4">
      <FormAlert message={error} />
      {secondsLeft <= 0 ? <Captcha ref={captchaRef} onToken={setCaptchaToken} /> : null}
      <Button
        type="button"
        variant="outline"
        size="touch"
        className="w-full"
        disabled={pending || secondsLeft > 0}
        onClick={resend}
      >
        <RotateCw className={pending ? "size-4 animate-spin" : "size-4"} aria-hidden="true" />
        <span aria-live="polite">
          {secondsLeft > 0 ? t("resendIn", { seconds: secondsLeft }) : t("resend")}
        </span>
      </Button>
    </div>
  );
}
