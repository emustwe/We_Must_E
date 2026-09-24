"use client";

import { MapPinned, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { PillNav } from "@/components/layout/pill-nav";

export function EmployerTabs() {
  const t = useTranslations("tabs");
  return (
    <PillNav
      label="Employer"
      tabs={[
        {
          href: "/employer",
          label: t("jobs"),
          icon: MapPinned,
          exact: true,
          match: ["/employer/jobs"],
        },
        { href: "/employer/account", label: t("account"), icon: Settings },
      ]}
    />
  );
}
