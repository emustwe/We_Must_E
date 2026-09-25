"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm, useWatch, type Path } from "react-hook-form";
import { createJob, updateJob } from "@/actions/employer";
import { LocationPicker } from "@/components/employer/location-picker";
import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COUNTRIES } from "@/lib/geo/countries";
import type { Bounds } from "@/lib/jobs/meta";
import { cn } from "@/lib/utils";
import { jobSchema, type JobInput } from "@/lib/validations/jobs";

// The whole job post: title, description and a place on the map.
export function JobForm({
  jobId,
  defaults,
  bounds,
}: {
  jobId?: string;
  defaults?: JobInput;
  bounds: Bounds;
}) {
  const t = useTranslations("jobForm");
  const te = useTranslations("errors");
  const tAll = useTranslations();
  const tr = (key?: string) =>
    key ? (tAll.has(key as never) ? tAll(key as never) : te("invalidInput")) : null;
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<JobInput>({
    resolver: zodResolver(jobSchema),
    mode: "onBlur",
    defaultValues: defaults ?? { title: "", description: "", locationLabel: "", city: "" },
  });
  const { errors } = form.formState;
  const lat = useWatch({ control: form.control, name: "lat" });
  const lng = useWatch({ control: form.control, name: "lng" });
  const description = useWatch({ control: form.control, name: "description" }) ?? "";

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = jobId ? await updateJob(jobId, values) : await createJob(values);
      if (!result || result.ok) return;
      setFormError(te(result.error));
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        form.setError(field as Path<JobInput>, { message });
      }
    });
  });

  const locationError = errors.lat?.message ?? errors.lng?.message;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormAlert message={formError} />

      <Field label={t("title")} error={errors.title?.message}>
        {(props) => (
          <Input
            {...props}
            {...form.register("title")}
            placeholder={t("titlePlaceholder")}
            maxLength={120}
          />
        )}
      </Field>

      <Field
        label={t("description")}
        hint={t("descriptionCount", { count: description.length })}
        error={errors.description?.message}
      >
        {(props) => (
          <textarea
            {...props}
            {...form.register("description")}
            rows={6}
            maxLength={3000}
            placeholder={t("descriptionPlaceholder")}
            className="w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
          />
        )}
      </Field>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">{t("location")}</legend>
        <p className="text-sm text-muted-foreground">{t("locationHint")}</p>
        <LocationPicker
          bounds={bounds}
          value={typeof lat === "number" && typeof lng === "number" ? { lat, lng } : null}
          onChange={(p) => {
            form.setValue("lat", p.lat, { shouldValidate: true });
            form.setValue("lng", p.lng, { shouldValidate: true });
          }}
          onDetails={(d) => {
            if (d.label) form.setValue("locationLabel", d.label, { shouldValidate: true });
            if (d.countryCode)
              form.setValue("countryCode", d.countryCode, { shouldValidate: true });
            if (d.city) form.setValue("city", d.city, { shouldValidate: true });
          }}
        />
        {locationError ? (
          <p className="text-sm font-medium text-destructive">{tr(locationError)}</p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("country")} error={errors.countryCode?.message}>
            {(props) => (
              <select
                {...props}
                {...form.register("countryCode")}
                className="h-12 w-full rounded-xl border border-input bg-background px-3 text-base"
              >
                <option value="">{t("chooseCountry")}</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label={t("city")} error={errors.city?.message}>
            {(props) => (
              <Input
                {...props}
                {...form.register("city")}
                placeholder={t("cityPlaceholder")}
                maxLength={120}
              />
            )}
          </Field>
        </div>
        <Field
          label={t("locationLabel")}
          hint={t("locationLabelHint")}
          error={errors.locationLabel?.message}
        >
          {(props) => (
            <Input
              {...props}
              {...form.register("locationLabel")}
              placeholder={t("locationLabelPlaceholder")}
              maxLength={200}
            />
          )}
        </Field>
      </fieldset>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href={jobId ? `/sponsor/jobs/${jobId}` : "/sponsor"}
          className={cn(buttonVariants({ variant: "ghost", size: "touch" }))}
        >
          {t("cancel")}
        </Link>
        <SubmitButton pending={pending} className="sm:w-auto">
          {jobId ? t("submitEdit") : t("submitNew")}
        </SubmitButton>
      </div>
    </form>
  );
}
