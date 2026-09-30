"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addOutreachContacts } from "@/actions/outreach";
import { btn } from "@/components/admin/wm";
import { WmIcon } from "@/components/map/wm-icons";
import { OUTREACH_MAX_BATCH, parseContacts } from "@/lib/outreach/parse";

// "Add contacts": paste from a spreadsheet or open a CSV file, one company per
// line (Name, Company, Email, Country), and optionally a referral code.
export function OutreachAdd({ salespeople }: { salespeople: { id: string; label: string }[] }) {
  const t = useTranslations("adminOutreach");
  const te = useTranslations("errors");
  const router = useRouter();
  const [text, setText] = useState("");
  const [salespersonId, setSalespersonId] = useState("");
  const [pending, startTransition] = useTransition();
  const { contacts, badLines } = parseContacts(text);
  const tooMany = contacts.length > OUTREACH_MAX_BATCH;

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!contacts.length || tooMany) return;
        startTransition(async () => {
          const result = await addOutreachContacts({ contacts, salespersonId });
          if (!result.ok) {
            toast.error(te(result.error));
            return;
          }
          toast.success(t("added", result.data));
          setText("");
          router.refresh();
        });
      }}
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold">{t("pasteLabel")}</span>
        <textarea
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("pastePlaceholder")}
          className="w-full resize-y rounded-xl border border-[#D5DAE2] bg-white px-3.5 py-3 font-mono text-[13px] leading-relaxed"
        />
      </label>
      <div className="flex flex-wrap items-end gap-3">
        <label className={btn("secondary", "sm")}>
          <WmIcon name="download" size={15} stroke={2.2} />
          {t("openCsv")}
          <input
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) setText(await file.text());
            }}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold">{t("campaign")}</span>
          <select
            value={salespersonId}
            onChange={(e) => setSalespersonId(e.target.value)}
            className="h-9 rounded-[11px] border border-[#D5DAE2] bg-white px-3 text-[13px] font-semibold"
          >
            <option value="">{t("noCampaign")}</option>
            {salespeople.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <span className="grow" />
        <button
          type="submit"
          className={btn("primary", "sm")}
          disabled={pending || !contacts.length || tooMany}
        >
          <WmIcon name="plus" size={15} stroke={2.4} />
          {t("add", { count: contacts.length })}
        </button>
      </div>
      {text.trim() ? (
        <p className="m-0 text-[13px] font-semibold text-wm-slate" role="status">
          {tooMany
            ? t("tooMany", { max: OUTREACH_MAX_BATCH })
            : t("ready", { count: contacts.length })}
          {badLines.length ? (
            <span className="text-wm-danger">
              {" "}
              {t("badLines", { lines: badLines.slice(0, 10).join(", "), count: badLines.length })}
            </span>
          ) : null}
        </p>
      ) : null}
    </form>
  );
}
