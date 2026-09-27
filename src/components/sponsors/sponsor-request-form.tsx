"use client";

import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { requestSponsorship } from "@/actions/sponsor-request";
import { Captcha, captchaEnabled } from "@/components/auth/captcha";
import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { sponsorRequestSchema, type SponsorRequestInput } from "@/lib/validations/sponsor-request";

type Values = Required<Omit<SponsorRequestInput, "captchaToken">>;
const EMPTY: Values = {
  companyName: "",
  contactPerson: "",
  email: "",
  phone: "",
  city: "",
  website: "",
  message: "",
};

// "Become a sponsor": the company's details go to the Wemuste team, who create
// the account and email the login details.
export function SponsorRequestForm() {
  const t = useTranslations("forEmployers");
  const te = useTranslations("errors");
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string>();
  const captchaRef = useRef<TurnstileInstance>(undefined);
  const [pending, startTransition] = useTransition();

  const set = (name: keyof Values) => (value: string) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => ({ ...e, [name]: "" }));
  };

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const parsed = sponsorRequestSchema.safeParse({ ...values, captchaToken });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
      setErrors(next);
      return;
    }
    if (captchaEnabled && !captchaToken) {
      setFormError(te("captchaFailed"));
      return;
    }
    startTransition(async () => {
      const result = await requestSponsorship(parsed.data);
      if (result.ok) {
        setSent(true);
        return;
      }
      captchaRef.current?.reset();
      setCaptchaToken(undefined);
      if (result.fieldErrors) setErrors(result.fieldErrors);
      setFormError(te(result.error));
    });
  }

  if (sent) {
    return (
      <div role="status" className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="size-12 text-success" aria-hidden="true" />
        <h2 className="text-xl font-extrabold">{t("sentTitle")}</h2>
        <p className="text-muted-foreground">{t("sentBody")}</p>
      </div>
    );
  }

  const field = (
    name: keyof Values,
    label: string,
    options: { type?: string; autoComplete?: string; optional?: boolean } = {},
  ) => (
    <Field
      label={label}
      optionalLabel={options.optional ? t("optional") : undefined}
      error={errors[name]}
    >
      {(props) => (
        <Input
          {...props}
          type={options.type ?? "text"}
          autoComplete={options.autoComplete}
          value={values[name]}
          onChange={(e) => set(name)(e.target.value)}
          className="h-12 text-base"
        />
      )}
    </Field>
  );

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <FormAlert message={formError} />
      {field("companyName", t("companyName"), { autoComplete: "organization" })}
      {field("contactPerson", t("contactPerson"), { autoComplete: "name" })}
      {field("email", t("email"), { type: "email", autoComplete: "email" })}
      {field("phone", t("phone"), { type: "tel", autoComplete: "tel" })}
      {field("city", t("city"), { autoComplete: "address-level2" })}
      {field("website", t("website"), { type: "url", autoComplete: "url", optional: true })}
      <Field label={t("message")} optionalLabel={t("optional")} error={errors.message}>
        {(props) => (
          <textarea
            {...props}
            rows={4}
            maxLength={2000}
            value={values.message}
            onChange={(e) => set("message")(e.target.value)}
            placeholder={t("messagePlaceholder")}
            className="w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        )}
      </Field>
      <Captcha
        ref={captchaRef}
        onToken={setCaptchaToken}
        onFailed={() => setFormError(te("captchaFailed"))}
      />
      <SubmitButton pending={pending}>{pending ? t("sending") : t("send")}</SubmitButton>
    </form>
  );
}
