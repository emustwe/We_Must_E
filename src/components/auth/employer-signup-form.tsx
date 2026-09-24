"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Controller, useForm, useWatch } from "react-hook-form";
import { signUpEmployer } from "@/actions/auth";
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
import { employerSignupSchema, type EmployerSignupInput } from "@/lib/validations/auth";

export function EmployerSignupForm() {
  const t = useTranslations("signup");
  const form = useForm<EmployerSignupInput>({
    resolver: zodResolver(employerSignupSchema),
    mode: "onBlur",
    defaultValues: {
      companyName: "",
      contactPerson: "",
      email: "",
      phone: "",
      password: "",
      tradeLicenseNo: "",
      acceptTerms: false,
    },
  });
  const { submit, pending, formError, captcha } = useAuthSubmit(form, signUpEmployer);
  const { errors } = form.formState;
  const password = useWatch({ control: form.control, name: "password" });

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <FormAlert message={formError} />
      <Field label={t("companyName")} error={errors.companyName?.message}>
        {(props) => (
          <Input {...props} {...form.register("companyName")} autoComplete="organization" />
        )}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("contactPerson")} error={errors.contactPerson?.message}>
          {(props) => <Input {...props} {...form.register("contactPerson")} autoComplete="name" />}
        </Field>
        <Field label={t("phone")} error={errors.phone?.message}>
          {(props) => (
            <Input
              {...props}
              {...form.register("phone")}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder={t("phonePlaceholder")}
              dir="ltr"
            />
          )}
        </Field>
      </div>
      <Field label={t("workEmail")} error={errors.email?.message}>
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
      <Field
        label={t("tradeLicense")}
        optionalLabel={t("optional")}
        hint={t("tradeLicenseHint")}
        error={errors.tradeLicenseNo?.message}
      >
        {(props) => <Input {...props} {...form.register("tradeLicenseNo")} autoComplete="off" />}
      </Field>
      <Field label={t("password")} hint={t("passwordHint")} error={errors.password?.message}>
        {(props) => (
          <div className="space-y-2">
            <PasswordInput {...props} {...form.register("password")} autoComplete="new-password" />
            <PasswordStrength value={password ?? ""} />
          </div>
        )}
      </Field>
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
            {t.rich("acceptTerms", { terms: legalLink("/terms"), privacy: legalLink("/privacy") })}
          </ConsentCheckbox>
        )}
      />
      <Captcha {...captcha} />
      <SubmitButton pending={pending}>{t("submitEmployer")}</SubmitButton>
    </form>
  );
}
