"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, KeyRound } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm, type Path } from "react-hook-form";
import { createEmployer, type CreatedEmployer } from "@/actions/admin";
import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createEmployerSchema, type CreateEmployerInput } from "@/lib/validations/jobs";

export function CreateEmployerForm() {
  const t = useTranslations("admin");
  const te = useTranslations("errors");
  const [created, setCreated] = useState<CreatedEmployer | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const form = useForm<CreateEmployerInput>({
    resolver: zodResolver(createEmployerSchema),
    mode: "onBlur",
    defaultValues: {
      companyName: "",
      contactPerson: "",
      email: "",
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
    const text = `Wemuste employer login\nEmail: ${created.email}\nTemporary password: ${created.temporaryPassword}`;
    return (
      <div className="animate-in-fast space-y-5" role="status">
        <span className="flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
          <KeyRound className="size-6" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-extrabold">{t("createdTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("createdBody", { company: created.companyName })}
          </p>
        </div>
        <dl className="space-y-2 rounded-2xl bg-muted/70 p-4 font-mono text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">{t("email")}</dt>
            <dd className="font-semibold break-all">{created.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Password</dt>
            <dd className="text-lg font-bold tracking-wider" data-testid="temp-password">
              {created.temporaryPassword}
            </dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button
            size="touch"
            onClick={async () => {
              await navigator.clipboard.writeText(text);
              setCopied(true);
            }}
          >
            {copied ? (
              <Check className="size-4" aria-hidden="true" />
            ) : (
              <Copy className="size-4" aria-hidden="true" />
            )}
            {copied ? t("copied") : t("copy")}
          </Button>
          <Button
            size="touch"
            variant="secondary"
            onClick={() => {
              setCreated(null);
              setCopied(false);
            }}
          >
            {t("createAnother")}
          </Button>
          <Link
            href="/admin/employers"
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
