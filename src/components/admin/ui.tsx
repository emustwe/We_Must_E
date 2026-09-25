import type { ReactNode } from "react";
import { PageHeader, StatusPill, type PillTone } from "@/components/admin/wm";
import { cn } from "@/lib/utils";

// Older admin building blocks, drawn in the admin design (see wm.tsx).

export function PageTitle({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return <PageHeader title={title} body={body} actions={action} />;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("min-w-0 rounded-3xl bg-white p-[22px] shadow-wm-1", className)}>
      {children}
    </section>
  );
}

const TONES: Record<"muted" | "success" | "warning" | "danger" | "primary", PillTone> = {
  muted: "idle",
  success: "ok",
  warning: "warn",
  danger: "danger",
  primary: "blue",
};

export function Badge({
  tone = "muted",
  children,
}: {
  tone?: keyof typeof TONES;
  children: ReactNode;
}) {
  return <StatusPill tone={TONES[tone]}>{children}</StatusPill>;
}

export const APPLICATION_TONE = {
  in_progress: "muted",
  submitted: "warning",
  approved: "success",
  rejected: "danger",
} as const;
