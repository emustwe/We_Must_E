"use client";

import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { mfaCodeSchema } from "@/lib/validations/auth";

type Enrollment = { factorId: string; qrCode: string; secret: string };

// TOTP enrollment or challenge for admins. Runs in the browser with the user's
// own session; a successful verify upgrades the session to aal2.
export function MfaForm({ verifiedFactorId }: { verifiedFactorId: string | null }) {
  const t = useTranslations("admin");
  const te = useTranslations("errors");
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [fieldError, setFieldError] = useState<string>();
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (verifiedFactorId) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      // Remove abandoned, unverified factors so enrollment can restart cleanly.
      const { data: factors } = await supabase.auth.mfa.listFactors();
      for (const factor of factors?.all ?? []) {
        if (factor.factor_type === "totp" && factor.status === "unverified") {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (cancelled) return;
      if (error || !data) {
        setFormError(te("generic"));
        return;
      }
      setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    })();
    return () => {
      cancelled = true;
    };
  }, [verifiedFactorId, te]);

  const factorId = verifiedFactorId ?? enrollment?.factorId;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = mfaCodeSchema.safeParse({ code });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message);
      return;
    }
    if (!factorId) return;
    setFieldError(undefined);
    setFormError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: parsed.data.code,
      });
      if (error) {
        setFormError(t("mfaInvalid"));
        return;
      }
      router.replace("/admin");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <FormAlert message={formError} />
      {verifiedFactorId ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{t("mfaVerifyBody")}</p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">{t("mfaEnrollBody")}</p>
          <div className="flex min-h-48 items-center justify-center rounded-xl border bg-white p-4">
            {enrollment ? (
              // eslint-disable-next-line @next/next/no-img-element -- SVG data URL from Supabase
              <img src={enrollment.qrCode} alt="" className="size-44" />
            ) : (
              <ShieldCheck
                className="size-8 animate-pulse text-muted-foreground"
                aria-hidden="true"
              />
            )}
          </div>
          {enrollment ? (
            <p className="text-xs break-all text-muted-foreground">
              {t("mfaSecretLabel")}{" "}
              <code className="font-mono text-foreground">{enrollment.secret}</code>
            </p>
          ) : null}
        </div>
      )}
      <Field label={t("mfaCode")} error={fieldError}>
        {(props) => (
          <Input
            {...props}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            className="text-center font-mono text-lg tracking-[0.4em]"
            dir="ltr"
          />
        )}
      </Field>
      <SubmitButton pending={pending} disabled={!factorId}>
        {t("mfaSubmit")}
      </SubmitButton>
    </form>
  );
}
