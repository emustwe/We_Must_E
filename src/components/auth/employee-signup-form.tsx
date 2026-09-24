"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Controller, useForm, useWatch } from "react-hook-form";
import { signUpEmployee } from "@/actions/auth";
import { Captcha } from "@/components/auth/captcha";
import { ConsentCheckbox } from "@/components/auth/consent-checkbox";
import { legalLink } from "@/components/auth/legal-link";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordStrength } from "@/components/auth/password-strength";
import { useAuthSubmit } from "@/components/auth/use-auth-submit";
import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { employeeSignupSchema, type EmployeeSignupInput } from "@/lib/validations/auth";

export function EmployeeSignupForm() {
  const t = useTranslations("signup");
  const form = useForm<EmployeeSignupInput>({
    resolver: zodResolver(employeeSignupSchema),
    mode: "onBlur",
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      acceptTerms: false,
      acceptDataSharing: false,
    },
  });
  const { submit, pending, formError, captcha } = useAuthSubmit(form, signUpEmployee);
  const { errors } = form.formState;
  const password = useWatch({ control: form.control, name: "password" });

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <FormAlert message={formError} />
      <Field label={t("fullName")} error={errors.fullName?.message}>
        {(props) => (
          <Input
            {...props}
            {...form.register("fullName")}
            autoComplete="name"
            placeholder={t("fullNamePlaceholder")}
          />
        )}
      </Field>
      <Field label={t("email")} error={errors.email?.message}>
        {(props) => (
          <Input
            {...props}
            {...form.register("email")}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            placeholder={t("emailPlaceholder")}
          />
        )}
      </Field>
      <Field label={t("password")} hint={t("passwordHint")} error={errors.password?.message}>
        {(props) => (
          <div className="space-y-2">
            <PasswordInput {...props} {...form.register("password")} autoComplete="new-password" />
            <PasswordStrength value={password ?? ""} />
          </div>
        )}
      </Field>
      <div className="space-y-4 pt-1">
        <Controller
          control={form.control}
          name="acceptTerms"
          render={({ field, fieldState }) => (
            <ConsentCheckbox
              checked={field.value}
              onCheckedChange={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            >
              {t.rich("acceptTerms", {
                terms: legalLink("/terms"),
                privacy: legalLink("/privacy"),
              })}
            </ConsentCheckbox>
          )}
        />
        <Controller
          control={form.control}
          name="acceptDataSharing"
          render={({ field, fieldState }) => (
            <ConsentCheckbox
              checked={field.value}
              onCheckedChange={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            >
              {t("acceptDataSharing")}
            </ConsentCheckbox>
          )}
        />
      </div>
      <Captcha {...captcha} />
      <SubmitButton pending={pending}>{t("submitEmployee")}</SubmitButton>
    </form>
  );
}
