"use client";

import {
  Building2,
  FileClock,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  MapPinned,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

// Seven sections: a scrolling pill row under the header (admin is desktop-first
// but still usable on a phone).
export function AdminTabs() {
  const t = useTranslations("tabs");
  const pathname = usePathname();
  const tabs = [
    { href: "/admin", label: t("home"), icon: LayoutDashboard, exact: true },
    { href: "/admin/employees", label: t("employees"), icon: Users },
    { href: "/admin/employers", label: t("employers"), icon: Building2 },
    { href: "/admin/jobs", label: t("jobsAdmin"), icon: MapPinned },
    { href: "/admin/grants", label: t("grants"), icon: KeyRound },
    { href: "/admin/content", label: t("content"), icon: ListChecks },
    { href: "/admin/audit", label: t("audit"), icon: FileClock },
  ];
  return (
    <nav
      aria-label="Admin"
      className="sticky top-16 z-20 -mx-4 bg-background/90 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6"
    >
      <ul className="flex scrollbar-none gap-1.5 overflow-x-auto">
        {tabs.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "bg-muted text-foreground hover:bg-muted/70",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
