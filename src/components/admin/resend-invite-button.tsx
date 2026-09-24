"use client";

import { useTranslations } from "next-intl";
import { resendEmployerInvite } from "@/actions/admin";
import { ActionButton } from "@/components/admin/action-button";

export function ResendInviteButton({ employerId }: { employerId: string }) {
  const t = useTranslations("admin");
  return (
    <ActionButton
      size="pill"
      variant="secondary"
      action={resendEmployerInvite.bind(null, employerId)}
      success={t("inviteResent")}
    >
      {t("resendInvite")}
    </ActionButton>
  );
}
