"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Lock } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Controller, useForm, useWatch, type Path } from "react-hook-form";
import { createJob, updateJob } from "@/actions/employer";
import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { JobMap } from "@/components/map/job-map";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AVAILABILITY, CATEGORY_META, CITIES, JOB_CATEGORIES, PAY_PERIODS } from "@/lib/jobs/meta";
import { cn } from "@/lib/utils";
import { jobSchema, type JobInput } from "@/lib/validations/jobs";

const EXPIRY_OPTIONS = [7, 14, 30, 60, 90] as const;

export function JobForm({ jobId, defaults }: { jobId?: string; defaults?: Partial<JobInput> }) {
  const t = useTranslations("jobForm");
  const tc = useTranslations("categories");
  const ts = useTranslations("schedule");
  const tp = useTranslations("payPeriodLong");
  const te = useTranslations("errors");
  const tAll = useTranslations();
  // Translates a validation key produced by our Zod schemas.
  const tr = (key?: string) =>
    key ? (tAll.has(key as never) ? tAll(key as never) : te("invalidInput")) : null;
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<JobInput>({
    resolver: zodResolver(jobSchema),
    mode: "onBlur",
    defaultValues: {
      title: "",
      description: "",
      schedule: [],
      payMin: "" as unknown as number,
      payMax: "",
      payPeriod: "hour",
      spots: 1,
      cityEmirate: "Dubai",
      areaLabel: "",
      address: "",
      startsOn: "",
      expiresInDays: 30,
      ...defaults,
    },
  });
  const { errors } = form.formState;
  const city = useWatch({ control: form.control, name: "cityEmirate" });
  const lat = useWatch({ control: form.control, name: "lat" });
  const lng = useWatch({ control: form.control, name: "lng" });
  const cityMeta = CITIES.find((c) => c.id === city) ?? CITIES[0];

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

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormAlert message={formError} />

      <Field label={t("title")} error={errors.title?.message}>
        {(props) => (
          <Input {...props} {...form.register("title")} placeholder={t("titlePlaceholder")} />
        )}
      </Field>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t("category")}</legend>
        <Controller
          control={form.control}
          name="category"
          render={({ field }) => (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {JOB_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => field.onChange(c)}
                  aria-pressed={field.value === c}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-2xl border-2 p-3 text-xs font-semibold transition-colors",
                    field.value === c
                      ? "border-foreground bg-muted"
                      : "border-transparent bg-muted/60 hover:bg-muted",
                  )}
                >
                  <span className="text-2xl" aria-hidden="true">
                    {CATEGORY_META[c].emoji}
                  </span>
                  {tc(c)}
                </button>
              ))}
            </div>
          )}
        />
        {errors.category ? (
          <p className="text-sm font-medium text-destructive">{tr(errors.category.message)}</p>
        ) : null}
      </fieldset>

      <Field label={t("description")} error={errors.description?.message}>
        {(props) => (
          <textarea
            {...props}
            {...form.register("description")}
            rows={4}
            placeholder={t("descriptionPlaceholder")}
            className="w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
          />
        )}
      </Field>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">{t("pay")}</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label={t("payMin")} error={errors.payMin?.message}>
            {(props) => (
              <Input {...props} {...form.register("payMin")} inputMode="decimal" dir="ltr" />
            )}
          </Field>
          <Field label={t("payMax")} error={errors.payMax?.message}>
            {(props) => (
              <Input {...props} {...form.register("payMax")} inputMode="decimal" dir="ltr" />
            )}
          </Field>
          <Field
            label={t("payPeriod")}
            className="col-span-2 sm:col-span-1"
            error={errors.payPeriod?.message}
          >
            {(props) => (
              <select
                {...props}
                {...form.register("payPeriod")}
                className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base"
              >
                {PAY_PERIODS.map((p) => (
                  <option key={p} value={p}>
                    {tp(p)}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t("schedule")}</legend>
        <Controller
          control={form.control}
          name="schedule"
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {AVAILABILITY.map((a) => {
                const on = field.value?.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      field.onChange(
                        on ? field.value.filter((v) => v !== a) : [...(field.value ?? []), a],
                      )
                    }
                    className={cn(
                      "h-10 rounded-full px-4 text-sm font-semibold transition-colors",
                      on ? "bg-foreground text-background" : "bg-muted hover:bg-muted/70",
                    )}
                  >
                    {ts(a)}
                  </button>
                );
              })}
            </div>
          )}
        />
        {errors.schedule ? (
          <p className="text-sm font-medium text-destructive">{tr(errors.schedule.message)}</p>
        ) : null}
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("spots")} error={errors.spots?.message}>
          {(props) => (
            <Input
              {...props}
              {...form.register("spots")}
              type="number"
              min={1}
              max={100}
              inputMode="numeric"
              dir="ltr"
            />
          )}
        </Field>
        <Field label={t("startsOn")} error={errors.startsOn?.message}>
          {(props) => <Input {...props} {...form.register("startsOn")} type="date" dir="ltr" />}
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("city")} error={errors.cityEmirate?.message}>
          {(props) => (
            <select
              {...props}
              {...form.register("cityEmirate")}
              className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base"
            >
              {CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label={t("area")} error={errors.areaLabel?.message}>
          {(props) => (
            <Input {...props} {...form.register("areaLabel")} placeholder={t("areaPlaceholder")} />
          )}
        </Field>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t("location")}</legend>
        <p className="text-sm text-muted-foreground">{t("locationHint")}</p>
        <JobMap
          className="relative h-72 rounded-3xl border"
          pins={[]}
          center={lat && lng ? [lng, lat] : (cityMeta.center as [number, number])}
          zoom={lat && lng ? 14 : cityMeta.zoom}
          pickMode
          picked={lat && lng ? { lat, lng } : null}
          onPick={(point) => {
            form.setValue("lat", Number(point.lat.toFixed(6)), { shouldValidate: true });
            form.setValue("lng", Number(point.lng.toFixed(6)), { shouldValidate: true });
          }}
        />
        {errors.lat || errors.lng ? (
          <p className="text-sm font-medium text-destructive">
            {tr((errors.lat ?? errors.lng)?.message)}
          </p>
        ) : null}
      </fieldset>

      <Field
        label={t("address")}
        hint={t("addressHint")}
        error={errors.address?.message}
        labelAside={<Lock className="size-3.5 text-muted-foreground" aria-hidden="true" />}
      >
        {(props) => (
          <Input {...props} {...form.register("address")} autoComplete="street-address" />
        )}
      </Field>

      <Field label={t("expires")}>
        {(props) => (
          <select
            {...props}
            {...form.register("expiresInDays")}
            className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base"
          >
            {EXPIRY_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {t("days", { count: d })}
              </option>
            ))}
          </select>
        )}
      </Field>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href={jobId ? `/employer/jobs/${jobId}` : "/employer"}
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
