"use client";

import { BadgeCheck, Banknote, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function TrustLines({ className }: { className?: string }) {
  const t = useTranslations("explore");
  const lines = [
    { icon: BadgeCheck, text: t("trustFree") },
    { icon: Banknote, text: t("trustMoney") },
    { icon: Lock, text: t("trustPrivate") },
  ];
  return (
    <ul className={cn("space-y-1.5 text-sm", className)}>
      {lines.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-center gap-2">
          <Icon className="size-4 shrink-0 text-success" aria-hidden="true" />
          {text}
        </li>
      ))}
    </ul>
  );
}
