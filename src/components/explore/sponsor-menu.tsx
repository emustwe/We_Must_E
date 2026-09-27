"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { WmIcon } from "@/components/map/wm-icons";
import { cn } from "@/lib/utils";

// "For sponsors" on the map: become a sponsor (a request to the team), or log
// in with an existing sponsor account.
export function SponsorMenu({ className }: { className?: string }) {
  const t = useTranslations("explore");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent ? e.key === "Escape" : !root.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  return (
    <div ref={root} className={cn("z-[1000]", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 items-center gap-2 rounded-full bg-white ps-3.5 pe-3 text-sm font-bold text-wm-ink shadow-wm-2"
      >
        <span className="text-wm-blue">
          <WmIcon name="briefcase" size={17} stroke={2.1} />
        </span>
        {t("forSponsorsMenu")}
        <WmIcon name="chevronDown" size={15} stroke={2.4} />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 mt-2 flex w-64 flex-col gap-1 rounded-2xl bg-white p-2 shadow-wm-3"
        >
          <SponsorLinks menu onPick={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}

// The two choices (also used in the phone menu).
export function SponsorLinks({ onPick, menu }: { onPick?: () => void; menu?: boolean }) {
  const role = menu ? "menuitem" : undefined;
  const t = useTranslations("explore");
  const item =
    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-wm-ink no-underline hover:bg-wm-mist";
  return (
    <>
      <Link role={role} href="/for-sponsors" onClick={onPick} className={item}>
        <span className="flex size-8 items-center justify-center rounded-lg bg-wm-tint text-wm-blue">
          <WmIcon name="plus" size={16} stroke={2.4} />
        </span>
        <span className="flex flex-col">
          {t("becomeSponsor")}
          <span className="text-xs font-medium text-wm-caption">{t("becomeSponsorHint")}</span>
        </span>
      </Link>
      <Link role={role} href="/login" onClick={onPick} className={item}>
        <span className="flex size-8 items-center justify-center rounded-lg bg-wm-mist text-wm-blue">
          <WmIcon name="key" size={16} stroke={2.2} />
        </span>
        <span className="flex flex-col">
          {t("employerLogin")}
          <span className="text-xs font-medium text-wm-caption">{t("sponsorLoginHint")}</span>
        </span>
      </Link>
    </>
  );
}
