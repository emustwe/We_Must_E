"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Form-level message. The live region stays mounted (hidden while empty) so
// screen readers announce new messages without an empty gap in the layout.
export function FormAlert({
  message,
  tone = "error",
}: {
  message?: string | null;
  tone?: "error" | "success";
}) {
  const Icon = tone === "error" ? AlertCircle : CheckCircle2;
  return (
    <div aria-live="polite" role={tone === "error" ? "alert" : "status"} className="empty:hidden">
      {message ? (
        <div
          className={cn(
            "animate-in-fast flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm",
            tone === "error"
              ? "border-destructive/30 bg-destructive/5 text-destructive"
              : "border-success/30 bg-success/5 text-success",
          )}
        >
          <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span className="leading-relaxed">{message}</span>
        </div>
      ) : null}
    </div>
  );
}
