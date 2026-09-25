"use client";

import { Building2, FileClock, Inbox, LayoutDashboard, ListChecks, MapPinned } from "lucide-react";
import { useTranslations } from "next-intl";
import { PillNav } from "@/components/layout/pill-nav";

export function AdminTabs() {
  const t = useTranslations("tabs");
  return (
    <PillNav
      label="Admin"
      tabs={[
        { href: "/admin", label: t("home"), icon: LayoutDashboard, exact: true },
        { href: "/admin/applications", label: t("applications"), icon: Inbox },
        { href: "/admin/sponsors", label: t("employers"), icon: Building2 },
        { href: "/admin/jobs", label: t("jobsAdmin"), icon: MapPinned },
        { href: "/admin/content", label: t("content"), icon: ListChecks },
        { href: "/admin/audit", label: t("audit"), icon: FileClock },
      ]}
    />
  );
}
