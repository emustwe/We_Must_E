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
import { useTranslations } from "next-intl";
import { PillNav } from "@/components/layout/pill-nav";

export function AdminTabs() {
  const t = useTranslations("tabs");
  return (
    <PillNav
      label="Admin"
      tabs={[
        { href: "/admin", label: t("home"), icon: LayoutDashboard, exact: true },
        { href: "/admin/employees", label: t("employees"), icon: Users },
        { href: "/admin/employers", label: t("employers"), icon: Building2 },
        { href: "/admin/jobs", label: t("jobsAdmin"), icon: MapPinned },
        { href: "/admin/grants", label: t("grants"), icon: KeyRound },
        { href: "/admin/content", label: t("content"), icon: ListChecks },
        { href: "/admin/audit", label: t("audit"), icon: FileClock },
      ]}
    />
  );
}
