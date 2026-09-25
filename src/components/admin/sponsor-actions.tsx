"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { resendSponsorInvite } from "@/actions/admin";
import { btn } from "@/components/admin/wm";
import { WmIcon } from "@/components/map/wm-icons";
import { useConfirm } from "@/components/ui/confirm-dialog";

function useResend(employerId: string, name: string) {
  const t = useTranslations("adminUi");
  const te = useTranslations("errors");
  const ask = useConfirm();
  const [pending, startTransition] = useTransition();
  const resend = async () => {
    const yes = await ask({
      title: t("resendConfirm", { name }),
      body: t("resendBody"),
      confirmLabel: t("resendInvite"),
    });
    if (!yes) return;
    startTransition(async () => {
      const result = await resendSponsorInvite(employerId);
      if (!result.ok) toast.error(te(result.error));
      else if (result.data.emailed) toast.success(t("inviteSent"));
      else toast.error(t("inviteNotSent"));
    });
  };
  return { resend, pending };
}

export function ResendInviteButton({ employerId, name }: { employerId: string; name: string }) {
  const t = useTranslations("adminUi");
  const { resend, pending } = useResend(employerId, name);
  return (
    <button type="button" disabled={pending} onClick={resend} className={btn("dark")}>
      <WmIcon name="mail" size={17} stroke={2.2} />
      {t("resendInvite")}
    </button>
  );
}

// The row's "more" menu: open the sponsor, or resend their invite.
export function SponsorRowMenu({ employerId, name }: { employerId: string; name: string }) {
  const t = useTranslations("adminUi");
  const { resend, pending } = useResend(employerId, name);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label={t("actionsFor", { name })}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex size-[38px] items-center justify-center rounded-xl border border-wm-field bg-white text-wm-body hover:bg-wm-mist"
      >
        <WmIcon name="more" size={18} stroke={2.6} />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute top-full right-0 z-20 mt-1.5 w-52 rounded-2xl bg-white py-1.5 shadow-wm-2"
        >
          <Link
            role="menuitem"
            href={`/admin/sponsors/${employerId}`}
            className="flex h-10 items-center gap-2.5 px-3.5 text-sm font-semibold text-wm-ink no-underline hover:bg-wm-mist"
          >
            <WmIcon name="building" size={16} stroke={2.1} />
            {t("openSponsor")}
          </Link>
          <button
            type="button"
            role="menuitem"
            disabled={pending}
            onClick={() => {
              setOpen(false);
              void resend();
            }}
            className="flex h-10 w-full items-center gap-2.5 border-0 bg-transparent px-3.5 text-start text-sm font-semibold text-wm-ink hover:bg-wm-mist"
          >
            <WmIcon name="mail" size={16} stroke={2.1} />
            {t("resendInvite")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

// The table's search box: filters by company, contact or email (URL ?q=).
export function SponsorSearch({ value }: { value: string }) {
  const t = useTranslations("adminUi");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(value);
  useEffect(() => {
    if (q === value) return;
    const id = window.setTimeout(() => {
      const next = new URLSearchParams(params);
      if (q.trim()) next.set("q", q.trim());
      else next.delete("q");
      router.replace(`${pathname}${next.size ? `?${next}` : ""}`);
    }, 300);
    return () => window.clearTimeout(id);
  }, [q, value, params, pathname, router]);
  return (
    <label className="flex h-[42px] w-full items-center gap-2 rounded-xl border border-wm-field px-3 text-wm-caption sm:w-[280px]">
      <WmIcon name="search" size={16} stroke={2.2} />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("searchSponsors")}
        aria-label={t("searchSponsors")}
        className="min-w-0 grow border-0 bg-transparent text-sm text-wm-ink outline-none focus-visible:outline-none"
      />
    </label>
  );
}
