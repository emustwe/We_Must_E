"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { requestPasswordReset } from "@/actions/auth";
import { Captcha } from "@/components/auth/captcha";
import { useAuthSubmit } from "@/components/auth/use-auth-submit";
import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth";

export function ForgotPasswordForm() {
  const t = useTranslations("forgot");
  const tl = useTranslations("login");
  const [sent, setSent] = useState(false);
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onBlur",
    defaultValues: { email: "" },
  });
  const { submit, pending, formError, captcha } = useAuthSubmit(form, requestPasswordReset, {
    onSuccess: () => setSent(true),
  });

  if (sent) {
    return (
      <div className="animate-in-fast space-y-5 text-center" role="status">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailCheck className="size-6" aria-hidden="true" />
        </span>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">{t("sentTitle")}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{t("sentBody")}</p>
        </div>
        <Link
          href="/login"
          className="inline-block text-sm font-medium text-primary hover:underline"
        >
          {t("backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <FormAlert message={formError} />
      <Field label={tl("email")} error={form.formState.errors.email?.message}>
        {(props) => (
          <Input
            {...props}
            {...form.register("email")}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
          />
        )}
      </Field>
      <Captcha {...captcha} />
      <SubmitButton pending={pending}>{t("submit")}</SubmitButton>
    </form>
  );
}
