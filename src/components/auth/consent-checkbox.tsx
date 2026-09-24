"use client";

import { useId, type ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslations } from "next-intl";

// Unticked by default; the user has to actively consent.
export function ConsentCheckbox({
  checked,
  onCheckedChange,
  onBlur,
  error,
  children,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onBlur?: () => void;
  error?: string;
  children: ReactNode;
}) {
  const t = useTranslations();
  const id = useId();
  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-3">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(value) => onCheckedChange(value === true)}
          onBlur={onBlur}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.5 size-5"
        />
        <label htmlFor={id} className="text-sm leading-relaxed text-muted-foreground">
          {children}
        </label>
      </div>
      {error ? (
        <p id={`${id}-error`} className="ps-8 text-sm font-medium text-destructive">
          {t(error as never)}
        </p>
      ) : null}
    </div>
  );
}
