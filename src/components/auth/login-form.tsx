"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { signIn } from "@/actions/auth";
import { Captcha } from "@/components/auth/captcha";
import { PasswordInput } from "@/components/auth/password-input";
import { useAuthSubmit } from "@/components/auth/use-auth-submit";
import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

export function LoginForm({ notice }: { notice?: string | null }) {
  const t = useTranslations("login");
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    defaultValues: { email: "", password: "" },
  });
  const { submit, pending, formError, captcha } = useAuthSubmit(form, signIn);
  const { errors } = form.formState;

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {notice && !formError ? <FormAlert tone="success" message={notice} /> : null}
      <FormAlert message={formError} />
      <Field label={t("email")} error={errors.email?.message}>
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
        label={t("password")}
        error={errors.password?.message}
        labelAside={
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-primary hover:underline"
          >
            {t("forgot")}
          </Link>
        }
      >
        {(props) => (
          <PasswordInput
            {...props}
            {...form.register("password")}
            autoComplete="current-password"
          />
        )}
      </Field>
      <Captcha {...captcha} />
      <SubmitButton pending={pending}>{t("submit")}</SubmitButton>
    </form>
  );
}
