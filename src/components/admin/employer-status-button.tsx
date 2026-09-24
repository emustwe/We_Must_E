"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { setEmployerStatus } from "@/actions/admin";
import { Button } from "@/components/ui/button";

export function EmployerStatusButton({
  employerId,
  status,
}: {
  employerId: string;
  status: "pending" | "approved" | "suspended";
}) {
  const t = useTranslations("admin");
  const te = useTranslations("errors");
  const [pending, startTransition] = useTransition();
  const next = status === "approved" ? "suspended" : "approved";
  return (
    <Button
      size="pill"
      variant={next === "suspended" ? "ghost" : "secondary"}
      className={next === "suspended" ? "text-destructive" : undefined}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await setEmployerStatus({ employerId, status: next });
          if (!result.ok) toast.error(te(result.error));
        })
      }
    >
      {next === "suspended"
        ? t("suspend")
        : status === "pending"
          ? t("approveEmployer")
          : t("reactivate")}
    </Button>
  );
}
