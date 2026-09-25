"use client";

import { KeyRound, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteSponsor, setSponsorPassword } from "@/actions/admin";
import { PasswordInput } from "@/components/admin/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SponsorPasswordForm({ employerId }: { employerId: string }) {
  const t = useTranslations("admin");
  const te = useTranslations("errors");
  const tAll = useTranslations();
  const [password, setPassword] = useState("");
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await setSponsorPassword({ employerId, password, notify });
          if (!result.ok) {
            const key = result.fieldErrors?.password;
            setError(key && tAll.has(key as never) ? tAll(key as never) : te(result.error));
            return;
          }
          setPassword("");
          toast.success(result.data.emailed ? t("passwordChangedEmailed") : t("passwordChanged"));
        });
      }}
    >
      <Label htmlFor="sponsor-password">{t("newPassword")}</Label>
      <PasswordInput
        id="sponsor-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onGenerate={setPassword}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "sponsor-password-error" : undefined}
      />
      {error ? (
        <p id="sponsor-password-error" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={notify}
          onChange={(e) => setNotify(e.target.checked)}
          className="size-4"
        />
        {t("emailNewPassword")}
      </label>
      <Button size="touch" disabled={pending || password.length < 10}>
        <KeyRound className="size-4" aria-hidden="true" />
        {t("setPassword")}
      </Button>
    </form>
  );
}

// Deleting needs the company name typed in, since it can't be undone.
export function DeleteSponsor({
  employerId,
  companyName,
}: {
  employerId: string;
  companyName: string;
}) {
  const t = useTranslations("admin");
  const te = useTranslations("errors");
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();
  const matches = typed.trim().toLowerCase() === companyName.trim().toLowerCase();
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("deleteSponsorBody")}</p>
      <Label htmlFor="delete-confirm">{t("typeCompanyToDelete", { company: companyName })}</Label>
      <Input
        id="delete-confirm"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        autoComplete="off"
      />
      <Button
        variant="destructive"
        size="touch"
        disabled={!matches || pending}
        onClick={() =>
          startTransition(async () => {
            const result = await deleteSponsor(employerId);
            if (result && !result.ok) toast.error(te(result.error));
          })
        }
      >
        <Trash2 className="size-4" aria-hidden="true" />
        {t("deleteSponsor")}
      </Button>
    </div>
  );
}
