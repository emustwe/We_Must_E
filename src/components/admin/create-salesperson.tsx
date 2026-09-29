"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createSalesperson } from "@/actions/admin-sales";
import { btn } from "@/components/admin/wm";
import { WmIcon } from "@/components/map/wm-icons";

// "Create referral code": the code and the salesperson's nickname.
export function CreateSalesperson() {
  const t = useTranslations("adminSales");
  const tv = useTranslations();
  const te = useTranslations("errors");
  const router = useRouter();
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const input = "h-11 rounded-xl border border-[#D5DAE2] bg-white px-3.5 text-sm";
  const error = (name: string) =>
    errors[name] ? (
      <span className="text-xs font-semibold text-wm-danger">{tv(errors[name] as never)}</span>
    ) : null;
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await createSalesperson({ code, nickname });
          if (!result.ok) {
            setErrors(result.fieldErrors ?? {});
            if (!result.fieldErrors) toast.error(te(result.error));
            return;
          }
          toast.success(t("created"));
          setCode("");
          setNickname("");
          setErrors({});
          router.push(`/admin/sales/${result.data.id}`);
        });
      }}
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold">{t("code")}</span>
        <input
          className={`${input} font-mono uppercase`}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={20}
          placeholder="ALI10"
          autoComplete="off"
        />
        {error("code")}
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold">{t("nickname")}</span>
        <input
          className={input}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={60}
          placeholder={t("nicknamePlaceholder")}
        />
        {error("nickname")}
      </label>
      <button type="submit" className={btn("primary")} disabled={pending}>
        <WmIcon name="plus" size={17} stroke={2.2} />
        {t("create")}
      </button>
    </form>
  );
}
