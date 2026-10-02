"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { updateOutreachContact } from "@/actions/outreach";
import { btn, StatusPill, type PillTone } from "@/components/admin/wm";
import { WmIcon } from "@/components/map/wm-icons";
import { useConfirm } from "@/components/ui/confirm-dialog";
import type { OutreachStatus } from "@/lib/outreach/config";
import { outreachEmail, outreachLink } from "@/lib/outreach/email";

export type OutreachRowData = {
  id: string;
  token: string;
  name: string;
  company: string;
  email: string;
  country: string | null;
  status: OutreachStatus;
  linkOff: boolean;
  openCount: number;
  code: string | null;
  dates: string;
};

const TONE: Record<OutreachStatus, PillTone> = {
  new: "idle",
  sent: "blue",
  opened: "warn",
  signed_up: "ok",
  unsubscribed: "danger",
};

// Copies the designed email (so the mailbox keeps the picture and the
// button), with the plain text for mail apps that only take text.
async function copyEmail(html: string, text: string) {
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" }),
      }),
    ]);
  } else {
    await navigator.clipboard.writeText(text);
  }
}

// One contact: copy their email, mark it sent, and their link's state.
export function OutreachRow({ row, site }: { row: OutreachRowData; site: string }) {
  const t = useTranslations("adminOutreach");
  const te = useTranslations("errors");
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const email = outreachEmail({ site, token: row.token });
  const unsubscribed = row.status === "unsubscribed";

  const copy = (what: "address" | "subject" | "email") => async () => {
    try {
      if (what === "email") await copyEmail(email.html, email.text);
      else await navigator.clipboard.writeText(what === "address" ? row.email : email.subject);
      toast.success(t(`copied.${what}`));
    } catch {
      toast.error(t("copyFailed"));
    }
  };
  const run = async (action: "sent" | "link_off" | "link_on" | "delete") => {
    // Asked before the update starts: a pop-up opened inside a transition
    // would only show once it ended.
    if (
      action === "delete" &&
      !(await confirm({
        title: t("deleteTitle"),
        body: t("deleteBody"),
        confirmLabel: t("delete"),
        tone: "danger",
      }))
    ) {
      return;
    }
    startTransition(async () => {
      const result = await updateOutreachContact({ id: row.id, action });
      if (!result.ok) toast.error(te(result.error));
      else router.refresh();
    });
  };

  return (
    <li
      className="flex flex-col gap-3 border-b border-wm-line py-4 last:border-0"
      data-contact={row.email}
    >
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
        <span className="flex min-w-0 grow flex-col gap-0.5">
          <span className="text-[15px] font-extrabold">
            {row.company} <span className="font-semibold text-wm-slate">· {row.name}</span>
          </span>
          <span className="text-[13px] font-semibold break-all text-wm-body">{row.email}</span>
          <span className="text-xs font-semibold text-wm-caption">
            {[row.country, row.code, row.dates].filter(Boolean).join(" · ")}
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-2">
          {row.openCount ? (
            <span className="text-xs font-bold text-wm-slate">
              {t("opens", { count: row.openCount })}
            </span>
          ) : null}
          {row.linkOff ? <StatusPill tone="idle">{t("linkIsOff")}</StatusPill> : null}
          <StatusPill tone={TONE[row.status]}>{t(`status.${row.status}`)}</StatusPill>
        </span>
      </div>
      {unsubscribed ? null : (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn("secondary", "sm")} onClick={copy("address")}>
            <WmIcon name="mail" size={15} stroke={2.2} />
            {t("copyAddress")}
          </button>
          <button type="button" className={btn("secondary", "sm")} onClick={copy("subject")}>
            <WmIcon name="clipboardCheck" size={15} stroke={2.2} />
            {t("copySubject")}
          </button>
          <button type="button" className={btn("primary", "sm")} onClick={copy("email")}>
            <WmIcon name="clipboardCheck" size={15} stroke={2.2} />
            {t("copyEmail")}
          </button>
          {row.status === "new" ? (
            <button
              type="button"
              className={btn("dark", "sm")}
              disabled={pending}
              onClick={() => run("sent")}
            >
              <WmIcon name="check" size={15} stroke={2.4} />
              {t("markSent")}
            </button>
          ) : null}
          <a
            href={outreachLink(site, row.token)}
            target="_blank"
            rel="noreferrer"
            className={btn("ghost", "sm")}
          >
            <WmIcon name="external" size={15} stroke={2.2} />
            {t("openLink")}
          </a>
          <button
            type="button"
            className={btn("ghost", "sm")}
            disabled={pending}
            onClick={() => run(row.linkOff ? "link_on" : "link_off")}
          >
            <WmIcon name={row.linkOff ? "key" : "lock"} size={15} stroke={2.2} />
            {row.linkOff ? t("linkOn") : t("linkOff")}
          </button>
          <button
            type="button"
            className={btn("dangerText", "sm")}
            disabled={pending}
            onClick={() => run("delete")}
          >
            <WmIcon name="trash" size={15} stroke={2.2} />
            {t("delete")}
          </button>
        </div>
      )}
    </li>
  );
}
