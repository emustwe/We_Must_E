"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { updatePassword } from "@/actions/auth";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordStrength } from "@/components/auth/password-strength";
import { useAuthSubmit } from "@/components/auth/use-auth-submit";
import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth";

export function ResetPasswordForm() {
  const t = useTranslations("reset");
  const ts = useTranslations("signup");
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onBlur",
    defaultValues: { password: "", confirmPassword: "" },
  });
  // No captcha: the recovery session from the emailed link already proves intent.
  const { submit, pending, formError } = useAuthSubmit(form, updatePassword, {
    withCaptcha: false,
  });
  const { errors } = form.formState;
  const password = useWatch({ control: form.control, name: "password" });

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
      <SubmitButton pending={pending}>{t("submit")}</SubmitButton>
    </form>
  );
}
