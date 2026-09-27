"use client";

import { Ban, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { blockSponsor, deleteSponsor } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SPONSOR_BLOCKS } from "@/lib/validations/jobs";

// Block the sponsor's login for a while, or until unblocked (also logs them
// out everywhere); or unblock.
export function BlockSponsor({
  employerId,
  blockedUntil,
}: {
  employerId: string;
  blockedUntil: string | null;
}) {
  const t = useTranslations("admin");
  const te = useTranslations("errors");
  const format = useFormatter();
  const router = useRouter();
  const [duration, setDuration] = useState<(typeof SPONSOR_BLOCKS)[number]>("7d");
  const [pending, startTransition] = useTransition();
  const run = (d: (typeof SPONSOR_BLOCKS)[number]) =>
    startTransition(async () => {
      const result = await blockSponsor({ employerId, duration: d });
      if (!result.ok) toast.error(te(result.error));
      else {
        toast.success(d === "none" ? t("unblocked") : t("blocked"));
        router.refresh();
      }
    });
  const blocked = blockedUntil && new Date(blockedUntil) > new Date();
  if (blocked) {
    const until = new Date(blockedUntil);
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-destructive">
          {until.getFullYear() > 2100
            ? t("blockedForever")
            : t("blockedUntil", {
                date: format.dateTime(until, { dateStyle: "medium", timeStyle: "short" }),
              })}
        </p>
        <Button size="touch" variant="outline" disabled={pending} onClick={() => run("none")}>
          {t("unblock")}
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t("blockFor")}
        <select
          value={duration}
          onChange={(e) => setDuration(e.target.value as (typeof SPONSOR_BLOCKS)[number])}
          className="h-11 rounded-xl border border-input bg-background px-3 text-base"
        >
          {(["1d", "7d", "30d", "forever"] as const).map((d) => (
            <option key={d} value={d}>
              {t(`blockOption.${d}`)}
            </option>
          ))}
        </select>
      </label>
      <Button size="touch" variant="destructive" disabled={pending} onClick={() => run(duration)}>
        <Ban className="size-4" aria-hidden="true" />
        {t("block")}
      </Button>
    </div>
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
