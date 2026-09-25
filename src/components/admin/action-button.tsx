"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition, type ComponentProps } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import type { ActionResult } from "@/lib/result";

// Button that runs a server action, with optional confirm and toasts.
export function ActionButton({
  action,
  confirm,
  danger,
  success,
  children,
  ...props
}: Omit<ComponentProps<typeof Button>, "onClick" | "action"> & {
  action: () => Promise<ActionResult<unknown>>;
  confirm?: string;
  // Red confirm button (delete, remove...).
  danger?: boolean;
  success?: string;
}) {
  const te = useTranslations("errors");
  const ask = useConfirm();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      {...props}
      disabled={pending || props.disabled}
      onClick={async () => {
        if (confirm && !(await ask({ title: confirm, tone: danger ? "danger" : "default" })))
          return;
        startTransition(async () => {
          const result = await action();
          if (!result.ok) toast.error(te(result.error));
          else if (success) toast.success(success);
        });
      }}
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </Button>
  );
}
