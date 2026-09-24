"use client";

import { Eye, EyeOff, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ComponentProps, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Password field with show/hide toggle and a Caps Lock warning.
export function PasswordInput({ className, onKeyUp, ...props }: ComponentProps<"input">) {
  const t = useTranslations("password");
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  function handleKey(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState?.("CapsLock") ?? false);
    onKeyUp?.(event);
  }

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Input
          type={visible ? "text" : "password"}
          className={cn("pe-12", className)}
          onKeyUp={handleKey}
          onKeyDown={handleKey}
          autoCapitalize="none"
          spellCheck={false}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t("hide") : t("show")}
          aria-pressed={visible}
          className="absolute inset-y-0 end-0 flex w-11 items-center justify-center rounded-e-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      <p
        aria-live="polite"
        className="text-sm text-brand-accent-foreground empty:hidden dark:text-brand-accent"
      >
        {capsLock ? (
          <span className="inline-flex items-center gap-1.5">
            <TriangleAlert className="size-3.5" aria-hidden="true" />
            {t("capsLock")}
          </span>
        ) : null}
      </p>
    </div>
  );
}
