"use client";

import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SubmitButton({
  pending,
  children,
  className,
  ...props
}: ComponentProps<typeof Button> & { pending: boolean }) {
  return (
    <Button
      type="submit"
      size="touch"
      disabled={pending || props.disabled}
      aria-busy={pending}
      className={cn("w-full", className)}
      {...props}
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </Button>
  );
}
