"use client";

import { Inbox, Map, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { TabBar } from "@/components/layout/tab-bar";

export function EmployeeTabs() {
  const t = useTranslations("tabs");
  return (
    <TabBar
      tabs={[
        { href: "/employee", label: t("map"), icon: Map, exact: true },
        { href: "/employee/requests", label: t("requests"), icon: Inbox },
        { href: "/employee/profile", label: t("profile"), icon: UserRound },
      ]}
    />
  );
}
