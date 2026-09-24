"use client";

import { Building2, LayoutDashboard } from "lucide-react";
import { useTranslations } from "next-intl";
import { TabBar } from "@/components/layout/tab-bar";

export function AdminTabs() {
  const t = useTranslations("tabs");
  return (
    <TabBar
      tabs={[
        { href: "/admin", label: t("home"), icon: LayoutDashboard, exact: true },
        { href: "/admin/employers", label: t("employers"), icon: Building2 },
      ]}
    />
  );
}
