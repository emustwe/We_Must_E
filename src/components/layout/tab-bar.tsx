"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type Tab = { href: string; label: string; icon: LucideIcon; exact?: boolean };

// App-style bottom navigation on phones; a floating pill on larger screens.
export function TabBar({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="pb-safe sm:shadow-float fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur sm:inset-x-auto sm:start-1/2 sm:bottom-4 sm:-translate-x-1/2 sm:rounded-full sm:border sm:pb-0 rtl:sm:translate-x-1/2"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around sm:gap-1 sm:px-2 sm:py-1.5">
        {tabs.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1 sm:flex-none">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors sm:h-11 sm:flex-row sm:gap-2 sm:rounded-full sm:px-5 sm:text-sm",
                  active
                    ? "text-foreground sm:bg-foreground sm:text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon
                  className={cn("size-5 sm:size-4", active && "stroke-[2.5]")}
                  aria-hidden="true"
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
