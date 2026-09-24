"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { acceptDataSharing, submitProfile } from "@/actions/onboarding";
import { ConsentCheckbox } from "@/components/auth/consent-checkbox";
import { FormAlert } from "@/components/forms/form-alert";
import { Button } from "@/components/ui/button";

export function FinishForm({ ready, needsConsent }: { ready: boolean; needsConsent: boolean }) {
  const t = useTranslations("onboarding.done");
  const te = useTranslations("errors");
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      if (needsConsent) {
        const consent = await acceptDataSharing();
        if (!consent.ok) return setError(te(consent.error));
      }
      const result = await submitProfile();
      if (result && !result.ok) {
        setError(te(result.error));
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <FormAlert message={error} />
      {needsConsent ? (
        <ConsentCheckbox checked={agreed} onCheckedChange={setAgreed}>
          {t("consent")}
        </ConsentCheckbox>
      ) : null}
      {!ready ? <p className="text-sm text-muted-foreground">{t("missing")}</p> : null}
      <Button
        size="touch"
        className="w-full"
        onClick={submit}
        disabled={!ready || pending || (needsConsent && !agreed)}
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {t("submit")}
      </Button>
    </div>
  );
}
