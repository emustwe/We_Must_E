"use client";

import { MapPinned, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { PillNav } from "@/components/layout/pill-nav";

export function EmployerTabs() {
  const t = useTranslations("tabs");
  return (
    <PillNav
      label="Sponsor"
      tabs={[
        {
          href: "/sponsor",
          label: t("jobs"),
          icon: MapPinned,
          exact: true,
          match: ["/sponsor/jobs"],
        },
        { href: "/sponsor/account", label: t("account"), icon: Settings },
      ]}
    />
  );
}
