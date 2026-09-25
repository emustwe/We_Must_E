"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addEcoins } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function EcoinForm({ employerId }: { employerId: string }) {
  const t = useTranslations("ecoins");
  const te = useTranslations("errors");
  const [amount, setAmount] = useState("10");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="grid gap-3 sm:grid-cols-[8rem_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await addEcoins({ employerId, amount: Number(amount), note });
          if (!result.ok) toast.error(te(result.error));
          else {
            toast.success(t("added"));
            setNote("");
          }
        });
      }}
    >
      <label className="space-y-1 text-sm font-medium">
        <span>{t("amount")}</span>
        <Input
          type="number"
          min={-1000}
          max={1000}
          step={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </label>
      <label className="space-y-1 text-sm font-medium">
        <span>{t("note")}</span>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          placeholder={t("notePlaceholder")}
        />
      </label>
      <Button size="touch" disabled={pending || !Number(amount)}>
        {t("add")}
      </Button>
    </form>
  );
}
