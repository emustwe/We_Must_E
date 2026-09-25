"use client";

import { Eye, EyeOff, Wand2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export { generatePassword } from "@/lib/generate-password";
import { generatePassword } from "@/lib/generate-password";

// Password field for admins: visible by default so it can be checked before
// it is emailed, with a "generate" button.
export function PasswordInput({
  onGenerate,
  ...props
}: ComponentProps<typeof Input> & { onGenerate: (password: string) => void }) {
  const t = useTranslations("admin");
  const [visible, setVisible] = useState(true);
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Input
          {...props}
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          spellCheck={false}
          dir="ltr"
          className="pe-11 font-mono"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t("hidePassword") : t("showPassword")}
          className="absolute end-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="touch"
        onClick={() => onGenerate(generatePassword())}
      >
        <Wand2 className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">{t("generate")}</span>
        <span className="sr-only sm:hidden">{t("generate")}</span>
      </Button>
    </div>
  );
}
