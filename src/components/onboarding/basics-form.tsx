"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Controller, useForm, type Path } from "react-hook-form";
import { saveBasics } from "@/actions/onboarding";
import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { ChipToggle } from "@/components/onboarding/chip-toggle";
import { Input } from "@/components/ui/input";
import { AVAILABILITY, CITIES } from "@/lib/jobs/meta";
import { LANGUAGE_OPTIONS, SKILL_SUGGESTIONS } from "@/lib/onboarding/constants";
import { basicsSchema, type BasicsInput } from "@/lib/validations/onboarding";

const toggle = (list: string[] = [], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

export function BasicsForm({ defaults, nextHref }: { defaults: BasicsInput; nextHref: string }) {
  const t = useTranslations("onboarding.basics");
  const to = useTranslations("onboarding");
  const ts = useTranslations("schedule");
  const te = useTranslations("errors");
  const tAll = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [customSkill, setCustomSkill] = useState("");
  const form = useForm<BasicsInput>({
    resolver: zodResolver(basicsSchema),
    mode: "onBlur",
    defaultValues: defaults,
  });
  const { errors } = form.formState;
  const tr = (key?: string) =>
    key ? (tAll.has(key as never) ? tAll(key as never) : te("invalidInput")) : null;

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await saveBasics(values);
      if (result.ok) return router.push(nextHref);
      setFormError(te(result.error));
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        form.setError(field as Path<BasicsInput>, { message });
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-7">
      <FormAlert message={formError} />

      <Field label={t("headline")} error={errors.headline?.message}>
        {(props) => (
          <Input {...props} {...form.register("headline")} placeholder={t("headlinePlaceholder")} />
        )}
      </Field>

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

      <Controller
        control={form.control}
        name="languages"
        render={({ field, fieldState }) => (
          <fieldset className="space-y-2.5">
            <legend className="text-sm font-medium">{t("languages")}</legend>
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map((lang) => (
                <ChipToggle
                  key={lang}
                  selected={field.value?.includes(lang) ?? false}
                  onToggle={() => field.onChange(toggle(field.value, lang))}
                >
                  {lang}
                </ChipToggle>
              ))}
            </div>
            {fieldState.error ? (
              <p className="text-sm font-medium text-destructive">{tr(fieldState.error.message)}</p>
            ) : null}
          </fieldset>
        )}
      />

      <Controller
        control={form.control}
        name="skills"
        render={({ field, fieldState }) => {
          const custom = (field.value ?? []).filter(
            (s) => !(SKILL_SUGGESTIONS as readonly string[]).includes(s),
          );
          const addCustom = () => {
            const value = customSkill.trim().slice(0, 40);
            if (value && !field.value?.includes(value))
              field.onChange([...(field.value ?? []), value]);
            setCustomSkill("");
          };
          return (
            <fieldset className="space-y-2.5">
              <legend className="text-sm font-medium">{t("skills")}</legend>
              <p className="text-sm text-muted-foreground">{t("skillsHint")}</p>
              <div className="flex flex-wrap gap-2">
                {[...SKILL_SUGGESTIONS, ...custom].map((skill) => (
                  <ChipToggle
                    key={skill}
                    selected={field.value?.includes(skill) ?? false}
                    onToggle={() => field.onChange(toggle(field.value, skill))}
                  >
                    {skill}
                  </ChipToggle>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustom();
                    }
                  }}
                  placeholder={t("addSkill")}
                  aria-label={t("addSkill")}
                />
                <button
                  type="button"
                  onClick={addCustom}
                  className="inline-flex h-12 shrink-0 items-center gap-1 rounded-xl bg-muted px-4 text-sm font-semibold"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  {t("add")}
                </button>
              </div>
              {fieldState.error ? (
                <p className="text-sm font-medium text-destructive">
                  {tr(fieldState.error.message)}
                </p>
              ) : null}
            </fieldset>
          );
        }}
      />

      <Controller
        control={form.control}
        name="availability"
        render={({ field, fieldState }) => (
          <fieldset className="space-y-2.5">
            <legend className="text-sm font-medium">{t("availability")}</legend>
            <div className="flex flex-wrap gap-2">
              {AVAILABILITY.map((a) => (
                <ChipToggle
                  key={a}
                  selected={field.value?.includes(a) ?? false}
                  onToggle={() => field.onChange(toggle(field.value, a) as typeof field.value)}
                >
                  {ts(a)}
                </ChipToggle>
              ))}
            </div>
            {fieldState.error ? (
              <p className="text-sm font-medium text-destructive">{tr(fieldState.error.message)}</p>
            ) : null}
          </fieldset>
        )}
      />

      <Field
        label={t("pay")}
        optionalLabel={t("optional")}
        error={errors.expectedPayRange?.message}
      >
        {(props) => (
          <Input
            {...props}
            {...form.register("expectedPayRange")}
            placeholder={t("payPlaceholder")}
          />
        )}
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("phone")} hint={t("phoneHint")} error={errors.phone?.message}>
          {(props) => (
            <Input
              {...props}
              {...form.register("phone")}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              placeholder="+971 50 123 4567"
            />
          )}
        </Field>
        <Field label={t("whatsapp")} optionalLabel={t("optional")} error={errors.whatsapp?.message}>
          {(props) => (
            <Input {...props} {...form.register("whatsapp")} type="tel" inputMode="tel" dir="ltr" />
          )}
        </Field>
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="size-3.5 shrink-0" aria-hidden="true" />
        {to("privacyNote")}
      </p>
      <SubmitButton pending={pending}>{to("continue")}</SubmitButton>
    </form>
  );
}
