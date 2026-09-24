"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { setInitialPassword } from "@/actions/employer";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordStrength } from "@/components/auth/password-strength";
import { useAuthSubmit } from "@/components/auth/use-auth-submit";
import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { setInitialPasswordSchema } from "@/lib/validations/jobs";

type Values = z.input<typeof setInitialPasswordSchema>;

export function SetPasswordForm() {
  const t = useTranslations("employer");
  const ts = useTranslations("signup");
  const form = useForm<Values>({
    resolver: zodResolver(setInitialPasswordSchema),
    mode: "onBlur",
    defaultValues: { password: "", confirmPassword: "" },
  });
  const { submit, pending, formError } = useAuthSubmit(form, setInitialPassword, {
    withCaptcha: false,
  });
  const password = useWatch({ control: form.control, name: "password" });
  const { errors } = form.formState;

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <FormAlert message={formError} />
      <Field label={t("newPassword")} hint={ts("passwordHint")} error={errors.password?.message}>
        {(props) => (
          <div className="space-y-2">
            <PasswordInput {...props} {...form.register("password")} autoComplete="new-password" />
            <PasswordStrength value={password ?? ""} />
          </div>
        )}
      </Field>
      <Field label={t("confirmPassword")} error={errors.confirmPassword?.message}>
        {(props) => (
          <PasswordInput
            {...props}
            {...form.register("confirmPassword")}
            autoComplete="new-password"
          />
        )}
      </Field>
      <SubmitButton pending={pending}>{t("welcomeSubmit")}</SubmitButton>
    </form>
  );
}
