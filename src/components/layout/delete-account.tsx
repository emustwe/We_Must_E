"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { deleteAccount } from "@/actions/account";
import { FormAlert } from "@/components/forms/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DeleteAccountCard({ body }: { body?: string }) {
  const t = useTranslations("account");
  const te = useTranslations("errors");
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <section className="rounded-3xl border-2 border-destructive/20 p-5">
      <h2 className="flex items-center gap-2 text-base font-bold text-destructive">
        <Trash2 className="size-4" aria-hidden="true" />
        {t("deleteTitle")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{body ?? t("deleteBody")}</p>
      {open ? (
        <div className="mt-4 space-y-3">
          <FormAlert message={error} />
          <label className="block space-y-2">
            <span className="text-sm font-medium">{t("typeDelete")}</span>
            <Input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoCapitalize="characters"
              autoComplete="off"
              dir="ltr"
            />
          </label>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="touch"
              disabled={confirm !== "DELETE" || pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteAccount({ confirm });
                  if (result && !result.ok) setError(te(result.error));
                })
              }
            >
              {t("deleteForever")}
            </Button>
            <Button variant="ghost" size="touch" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="touch"
          className="mt-3 text-destructive"
          onClick={() => setOpen(true)}
        >
          {t("deleteStart")}
        </Button>
      )}
    </section>
  );
}
