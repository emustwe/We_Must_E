"use client";

import { useTranslations } from "next-intl";
import { passwordStrength } from "@/lib/password-strength";
import { cn } from "@/lib/utils";

const BAR_COLORS = [
  "bg-destructive",
  "bg-destructive",
  "bg-brand-accent",
  "bg-success",
  "bg-success",
];

export function PasswordStrength({ value }: { value: string }) {
  const t = useTranslations("password");
  if (!value) return null;
  const score = passwordStrength(value);
  const level = t(`strength${score}`);

  return (
    <div className="space-y-1.5" aria-live="polite">
      <div className="flex gap-1.5" aria-hidden="true">
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-150",
              step <= Math.max(score, 1) ? BAR_COLORS[score] : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{t("strengthLabel", { level })}</p>
    </div>
  );
}
