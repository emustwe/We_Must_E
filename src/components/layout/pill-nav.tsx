"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type PillTab = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  match?: string[];
};

// Scrolling pill row under the header, for the employer and admin areas.
export function PillNav({ label, tabs }: { label: string; tabs: PillTab[] }) {
  const pathname = usePathname();
  const isActive = (tab: PillTab) =>
    tab.exact
      ? pathname === tab.href || (tab.match ?? []).some((m) => pathname.startsWith(m))
      : pathname.startsWith(tab.href);
  return (
    <nav
      aria-label={label}
      className="sticky top-16 z-20 -mx-4 bg-background/90 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6"
    >
      <ul className="flex scrollbar-none gap-1.5 overflow-x-auto">
        {tabs.map((tab) => {
          const active = isActive(tab);
          return (
            <li key={tab.href} className="shrink-0">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "bg-muted text-foreground hover:bg-muted/70",
                )}
              >
                <tab.icon className="size-4" aria-hidden="true" />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
