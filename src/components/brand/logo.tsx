import { cn } from "@/lib/utils";

// Placeholder mark until a brand kit exists: rounded square with a "W".
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path
        d="M8 11l3.2 10L16 13.5 20.8 21 24 11"
        fill="none"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-primary-foreground"
      />
      <circle cx="24" cy="8.5" r="2" className="fill-brand-accent" />
    </svg>
  );
}

export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span
        className={cn(
          "text-lg font-semibold tracking-tight",
          inverted ? "text-white" : "text-foreground",
        )}
      >
        Wemuste
      </span>
    </span>
  );
}
