"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { verifySignupCode } from "@/actions/auth";
import { FormAlert } from "@/components/forms/form-alert";
import { Button } from "@/components/ui/button";

// One box for the 6-digit code. Phones can autofill it from the email
// (autocomplete="one-time-code"); it submits as soon as 6 digits are in.
export function VerifyCodeForm() {
  const t = useTranslations("verify");
  const te = useTranslations("errors");
  const tAll = useTranslations();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(value: string) {
    if (!/^\d{6}$/.test(value) || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await verifySignupCode({ code: value });
      if (result && !result.ok) {
        const key = result.fieldErrors?.code;
        setError(key && tAll.has(key as never) ? tAll(key as never) : te(result.error));
        setCode("");
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(code);
      }}
      className="space-y-4"
      noValidate
    >
      <FormAlert message={error} />
      <label className="block space-y-2">
        <span className="text-sm font-medium">{t("codeLabel")}</span>
        <input
          value={code}
          onChange={(e) => {
            const next = e.target.value.replace(/\D/g, "").slice(0, 6);
            setCode(next);
            if (next.length === 6) submit(next);
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          autoFocus
          dir="ltr"
          aria-invalid={Boolean(error)}
          className="h-16 w-full rounded-2xl border-2 border-input bg-background text-center font-mono text-3xl font-bold tracking-[0.5em] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
        />
      </label>
      <Button type="submit" size="touch" className="w-full" disabled={code.length !== 6 || pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {t("submit")}
      </Button>
    </form>
  );
}
