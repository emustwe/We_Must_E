"use client";

import { useTranslations } from "next-intl";
import { useId, type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldRenderProps = {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby": string | undefined;
};

// Label + control + hint + error, wired up for screen readers. `error` is a
// message key from the "validation" namespace (as produced by our Zod schemas).
export function Field({
  label,
  optionalLabel,
  hint,
  error,
  labelAside,
  children,
  className,
}: {
  label: string;
  optionalLabel?: string;
  hint?: string;
  error?: string;
  labelAside?: ReactNode;
  children: (props: FieldRenderProps) => ReactNode;
  className?: string;
}) {
  const t = useTranslations();
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
          {optionalLabel ? (
            <span className="font-normal text-muted-foreground"> ({optionalLabel})</span>
          ) : null}
        </Label>
        {labelAside}
      </div>
      {children({
        id,
        "aria-invalid": Boolean(error),
        "aria-describedby": [hintId, errorId].filter(Boolean).join(" ") || undefined,
      })}
      {hint && !error ? (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm font-medium text-destructive">
          {/* Keys come from our own schemas; fall back to a generic message. */}
          {t.has(error as never) ? t(error as never) : t("errors.invalidInput")}
        </p>
      ) : null}
    </div>
  );
}
