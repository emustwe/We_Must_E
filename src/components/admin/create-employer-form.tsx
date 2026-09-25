"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm, type Path } from "react-hook-form";
import { createEmployer, type CreatedSponsor } from "@/actions/admin";
import { PasswordInput } from "@/components/admin/password-input";
import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createEmployerSchema, type CreateEmployerInput } from "@/lib/validations/jobs";

export function CreateEmployerForm() {
  const t = useTranslations("admin");
  const te = useTranslations("errors");
  const [created, setCreated] = useState<CreatedSponsor | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<CreateEmployerInput>({
    resolver: zodResolver(createEmployerSchema),
    mode: "onBlur",
    defaultValues: {
      companyName: "",
      contactPerson: "",
      email: "",
      password: "",
      phone: "",
      tradeLicenseNo: "",
      website: "",
    },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await createEmployer(values);
      if (result.ok) {
        setCreated(result.data);
        form.reset();
        return;
      }
      setFormError(te(result.error));
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        form.setError(field as Path<CreateEmployerInput>, { message });
      }
    });
  });

  if (created) {
    return (
      <div className="animate-in-fast space-y-5" role="status">
        <span className="flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
          <MailCheck className="size-6" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-extrabold">{t("createdTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {created.emailed
              ? t("createdBody", { email: created.email })
              : t("createdNoEmail", { email: created.email })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="touch" onClick={() => setCreated(null)}>
            {t("createAnother")}
          </Button>
          <Link
            href="/admin/sponsors"
            className={buttonVariants({ size: "touch", variant: "ghost" })}
          >
            {t("backToEmployers")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormAlert message={formError} />
      <Field label={t("companyName")} error={errors.companyName?.message}>
        {(props) => <Input {...props} {...form.register("companyName")} autoComplete="off" />}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("contactPerson")} error={errors.contactPerson?.message}>
          {(props) => <Input {...props} {...form.register("contactPerson")} autoComplete="off" />}
        </Field>
        <Field label={t("phone")} error={errors.phone?.message}>
          {(props) => (
            <Input {...props} {...form.register("phone")} type="tel" dir="ltr" autoComplete="off" />
          )}
        </Field>
      </div>
      <Field label={t("email")} error={errors.email?.message}>
        {(props) => (
          <Input
            {...props}
            {...form.register("email")}
            type="email"
            autoCapitalize="none"
            autoComplete="off"
          />
        )}
      </Field>
      <Field label={t("password")} hint={t("passwordHint")} error={errors.password?.message}>
        {(props) => (
          <PasswordInput
            {...props}
            {...form.register("password")}
            onGenerate={(p) => form.setValue("password", p, { shouldValidate: true })}
          />
        )}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label={t("tradeLicense")}
          optionalLabel={t("optional")}
          error={errors.tradeLicenseNo?.message}
        >
          {(props) => <Input {...props} {...form.register("tradeLicenseNo")} autoComplete="off" />}
        </Field>
        <Field label={t("website")} optionalLabel={t("optional")} error={errors.website?.message}>
          {(props) => (
            <Input
              {...props}
              {...form.register("website")}
              type="url"
              dir="ltr"
              placeholder="https://"
              autoComplete="off"
            />
          )}
        </Field>
      </div>
      <SubmitButton pending={pending}>{t("createSubmit")}</SubmitButton>
    </form>
  );
}
