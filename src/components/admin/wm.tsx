import Link from "next/link";
import type { ReactNode } from "react";
import { WmIcon, type IconName } from "@/components/map/wm-icons";
import { initials } from "@/lib/sponsors/initials";
import { cn } from "@/lib/utils";

// Building blocks of the admin design (reference/admin/*.html).

export function PageHeader({
  title,
  body,
  actions,
}: {
  title: string;
  body?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="flex max-w-[720px] flex-col gap-1.5">
        <h1 className="m-0 text-[26px] leading-[1.1] font-extrabold tracking-[-0.9px] break-words sm:text-[30px]">
          {title}
        </h1>
        {body ? (
          <p className="m-0 text-[15px] leading-[1.5] font-medium text-wm-slate">{body}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2.5">{actions}</div> : null}
    </div>
  );
}

export function WCard({
  children,
  className,
  as: Tag = "section",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article" | "li";
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={cn("min-w-0 rounded-3xl bg-white shadow-wm-1", className)} {...rest}>
      {children}
    </Tag>
  );
}

export type PillTone = "warn" | "ok" | "idle" | "sample" | "danger" | "blue";
const PILL: Record<PillTone, string> = {
  warn: "bg-wm-warn-bg text-wm-warn",
  ok: "bg-wm-ok-bg text-wm-ok",
  idle: "bg-wm-idle-bg text-wm-slate",
  sample: "bg-wm-sample-bg text-wm-sample",
  danger: "bg-[#FDE3E4] text-wm-danger",
  blue: "bg-wm-tint text-wm-blue",
};

// 24px, fully rounded, with a 6px dot in front of the label.
export function StatusPill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold whitespace-nowrap",
        PILL[tone],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  );
}

export const APP_PILL = {
  submitted: "warn",
  approved: "ok",
  rejected: "danger",
  in_progress: "idle",
} as const satisfies Record<string, PillTone>;

export const JOB_PILL = {
  pending: "warn",
  published: "ok",
  rejected: "danger",
  hidden: "idle",
  closed: "idle",
  removed: "danger",
} as const satisfies Record<string, PillTone>;

// Segmented tabs: a #E9ECF1 track; the active tab is a white segment.
export function Segmented({
  label,
  items,
}: {
  label: string;
  items: { href: string; label: string; active: boolean; count?: number }[];
}) {
  return (
    <nav
      aria-label={label}
      className="inline-flex max-w-full [scrollbar-width:none] gap-0.5 overflow-x-auto rounded-[15px] bg-wm-track p-1"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "flex h-[38px] shrink-0 items-center gap-2 rounded-[11px] px-3.5 text-sm font-bold whitespace-nowrap no-underline",
            item.active
              ? "bg-white text-wm-ink shadow-[0_1px_2px_rgba(11,18,32,0.08),0_2px_6px_rgba(11,18,32,0.06)]"
              : "text-wm-slate hover:text-wm-ink",
          )}
        >
          {item.label}
          {item.count ? (
            <span
              className={cn(
                "rounded-full px-[7px] py-px text-xs font-extrabold",
                item.active ? "bg-wm-tint text-wm-blue" : "bg-[#EEF0F4] text-wm-slate",
              )}
            >
              {item.count}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}

export type BtnKind = "primary" | "secondary" | "danger" | "dark" | "ghost" | "dangerText";
const BTN: Record<BtnKind, string> = {
  primary:
    "bg-wm-blue text-white shadow-[0_8px_20px_rgba(36,87,245,0.28)] hover:bg-wm-blue-pressed",
  secondary:
    "border border-wm-field bg-white text-wm-ink shadow-[0_1px_2px_rgba(11,18,32,0.05)] hover:bg-wm-mist",
  danger: "border border-wm-danger-line bg-white text-wm-danger hover:bg-[#FFF5F5]",
  dark: "bg-wm-ink text-white hover:bg-[#1c2436]",
  ghost: "bg-transparent text-wm-body hover:bg-wm-mist",
  dangerText: "bg-transparent text-wm-danger hover:bg-[#FFF5F5]",
};

// Buttons: 44px, radius 14, weight 700 ("sm": the 36px card buttons).
export function btn(kind: BtnKind = "primary", size: "md" | "sm" | "xs" = "md") {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 font-bold whitespace-nowrap no-underline transition-colors disabled:pointer-events-none disabled:opacity-50",
    size === "md" && "h-11 rounded-[14px] px-4 text-sm",
    size === "sm" && "h-9 rounded-[11px] px-3 text-[13px]",
    size === "xs" && "h-[38px] rounded-[14px] px-4 text-[13px]",
    BTN[kind],
  );
}

export function Icon({
  name,
  size = 17,
  stroke = 2.2,
}: {
  name: IconName;
  size?: number;
  stroke?: number;
}) {
  return <WmIcon name={name} size={size} stroke={stroke} />;
}

// Round avatar with initials (applicants, admins) or a tile (companies).
const TILES = [
  ["#F3E2D0", "#92400E"],
  ["#E3EAFF", "#2457F5"],
  ["#D5F5E6", "#047857"],
  ["#FCE4F1", "#BE185D"],
  ["#FDEFD0", "#B45309"],
] as const;
export function tileColors(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TILES[h % TILES.length];
}

export function Avatar({
  name,
  size = 38,
  kind = "person",
  className,
}: {
  name: string;
  size?: number;
  kind?: "person" | "admin" | "company";
  className?: string;
}) {
  const [bg, fg] =
    kind === "admin"
      ? ["#0B1220", "#FFFFFF"]
      : kind === "company"
        ? tileColors(name)
        : ["#E3EAFF", "#2457F5"];
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        fontSize: size >= 50 ? 17 : size >= 44 ? 14 : size >= 38 ? 12 : 11,
        borderRadius: kind === "company" ? 14 : 999,
      }}
      className={cn("flex shrink-0 items-center justify-center font-extrabold", className)}
    >
      {initials(name)}
    </span>
  );
}

// 44px tinted icon tile (stat cards, content cards).
export function IconTile({
  name,
  bg,
  fg,
  size = 44,
  radius = 14,
  iconSize = 21,
}: {
  name: IconName;
  bg: string;
  fg: string;
  size?: number;
  radius?: number;
  iconSize?: number;
}) {
  return (
    <span
      style={{ width: size, height: size, background: bg, color: fg, borderRadius: radius }}
      className="flex shrink-0 items-center justify-center"
    >
      <WmIcon name={name} size={iconSize} stroke={2.1} />
    </span>
  );
}

// The design's notice banner (#FEF6E4).
export function Notice({ children, icon = "info" }: { children: ReactNode; icon?: IconName }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#F6DFAE] bg-[#FEF6E4] px-[18px] py-3.5 text-sm font-semibold text-[#7A4B06]">
      <span className="shrink-0">
        <WmIcon name={icon} size={18} stroke={2.1} />
      </span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}

export function EmptyRow({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border-[1.5px] border-dashed border-[#C9D1DD] p-8 text-center text-sm font-semibold text-wm-caption">
      {children}
    </p>
  );
}

// "Sample" content is a badge, never "[SAMPLE]" in a title.
export { displayTitle, isSample } from "@/lib/jobs/display";
