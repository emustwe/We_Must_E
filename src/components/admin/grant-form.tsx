"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { createGrant } from "@/actions/admin-panel";
import { FormAlert } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { ChipToggle } from "@/components/onboarding/chip-toggle";
import { Input } from "@/components/ui/input";
import { SCOPES } from "@/lib/validations/admin";
import { cn } from "@/lib/utils";

type Option = { id: string; label: string; detail?: string };

export function GrantForm({ employers, employees }: { employers: Option[]; employees: Option[] }) {
  const t = useTranslations("admin");
  const te = useTranslations("errors");
  const tAll = useTranslations();
  const router = useRouter();
  const [employerId, setEmployerId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [scopes, setScopes] = useState<string[]>(["profile", "test", "video"]);
  const [expiresAt, setExpiresAt] = useState("");
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const visible = useMemo(
    () =>
      employees
        .filter((e) => `${e.label} ${e.detail ?? ""}`.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 100),
    [employees, query],
  );

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createGrant({
        employerId,
        employeeIds: selected,
        scopes,
        expiresAt,
        note,
      });
      if (!result.ok) {
        const fieldKey = Object.values(result.fieldErrors ?? {})[0];
        return setError(
          fieldKey && tAll.has(fieldKey as never) ? tAll(fieldKey as never) : te(result.error),
        );
      }
      toast.success(t("granted", { count: result.data.count }));
      router.push("/admin/grants");
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <FormAlert message={error} />
      <label className="block space-y-2">
        <span className="text-sm font-medium">{t("grantEmployer")}</span>
        <select
          value={employerId}
          onChange={(e) => setEmployerId(e.target.value)}
          required
          className="h-12 w-full rounded-xl border border-input bg-background px-4"
        >
          <option value="">{t("chooseEmployer")}</option>
          {employers.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          {t("grantEmployees")} · {selected.length}
        </legend>
        <div className="relative">
          <Search
            className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search")}
            aria-label={t("search")}
            className="ps-10"
          />
        </div>
        <ul className="max-h-72 space-y-1 overflow-y-auto rounded-2xl border p-2">
          {visible.map((e) => {
            const on = selected.includes(e.id);
            return (
              <li key={e.id}>
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5",
                    on ? "bg-muted" : "hover:bg-muted/50",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() =>
                      setSelected(on ? selected.filter((s) => s !== e.id) : [...selected, e.id])
                    }
                    className="size-4"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{e.label}</span>
                    {e.detail ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {e.detail}
                      </span>
                    ) : null}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t("grantScopes")}</legend>
        <div className="flex flex-wrap gap-2">
          {SCOPES.map((s) => (
            <ChipToggle
              key={s}
              selected={scopes.includes(s)}
              onToggle={() =>
                setScopes(scopes.includes(s) ? scopes.filter((x) => x !== s) : [...scopes, s])
              }
            >
              {t(`scopes.${s}`)}
            </ChipToggle>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium">{t("grantExpiry")}</span>
          <Input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            dir="ltr"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">{t("grantNote")}</span>
          <Input value={note} onChange={(e) => setNote(e.target.value.slice(0, 500))} />
        </label>
      </div>
      <SubmitButton pending={pending} disabled={!employerId || !selected.length || !scopes.length}>
        {t("grantSubmit")}
      </SubmitButton>
    </form>
  );
}
