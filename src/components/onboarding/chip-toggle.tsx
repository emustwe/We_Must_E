"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChipToggle({
  selected,
  onToggle,
  children,
}: {
  selected: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        "inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors",
        selected ? "bg-foreground text-background" : "bg-muted text-foreground hover:bg-muted/70",
      )}
    >
      {selected ? <Check className="size-4" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
