import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageTitle({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
        {body ? <p className="mt-1 max-w-2xl text-muted-foreground">{body}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("shadow-float rounded-3xl bg-card p-5", className)}>{children}</section>
  );
}

export function Badge({
  tone = "muted",
  children,
}: {
  tone?: "muted" | "success" | "warning" | "danger" | "primary";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        tone === "muted" && "bg-muted text-muted-foreground",
        tone === "success" && "bg-success/15 text-success",
        tone === "warning" &&
          "bg-brand-accent/20 text-brand-accent-foreground dark:text-brand-accent",
        tone === "danger" && "bg-destructive/10 text-destructive",
        tone === "primary" && "bg-primary/10 text-primary",
      )}
    >
      {children}
    </span>
  );
}

export const APPLICATION_TONE = {
  in_progress: "muted",
  submitted: "warning",
  approved: "success",
  rejected: "danger",
} as const;
