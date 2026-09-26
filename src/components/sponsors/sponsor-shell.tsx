"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { signOut } from "@/actions/auth";
import { Avatar, btn } from "@/components/admin/wm";
import { WmIcon, type IconName } from "@/components/map/wm-icons";
import { cn } from "@/lib/utils";

type Company = {
  name: string;
  logoUrl: string | null;
  approved: boolean;
  balance: number;
  jobs: number;
  newCandidates: number;
};

const CRUMBS_ID = "wm-sponsor-crumbs";

// The sponsor portal shell (Wemuste sponsor portal redesign): a 264px sidebar
// with the company, "Post a job", the menu and "How it works"; a 64px top bar
// with the page trail and "See your jobs on the map". A drawer on phones.
export function SponsorShell({
  company,
  person,
  children,
}: {
  company: Company | null;
  person: string;
  children: ReactNode;
}) {
  const t = useTranslations("sponsorUi");
  const tc = useTranslations("ecoins");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setOpen(false), 0);
    return () => window.clearTimeout(id);
  }, [pathname]);

  const nav: { href: string; label: string; icon: IconName; count?: number; tone?: "warn"; aria?: string }[] =
    company?.approved
      ? [
          { href: "/sponsor", label: t("yourJobs"), icon: "briefcase", count: company.jobs },
          {
            href: "/sponsor/candidates",
            label: t("candidates"),
            icon: "inbox",
            count: company.newCandidates,
            tone: "warn",
            aria: company.newCandidates
              ? tc("newCandidates", { count: company.newCandidates })
              : undefined,
          },
          { href: "/sponsor/account", label: t("account"), icon: "key" },
        ]
      : [];
  const active = (href: string) =>
    href === "/sponsor"
      ? pathname === "/sponsor" || pathname.startsWith("/sponsor/jobs")
      : pathname === href || pathname.startsWith(`${href}/`);

  const sidebar = (
    <div className="flex h-full flex-col gap-5 px-4 py-5">
      <Link href="/sponsor" className="flex items-center gap-2.5 px-1.5 py-1 text-wm-ink no-underline">
        <span className="flex size-[34px] items-center justify-center rounded-[11px] bg-wm-blue text-lg font-extrabold text-white">
          W
        </span>
        <span className="text-[17px] font-extrabold tracking-[-0.4px]">Wemuste</span>
        <span className="ms-auto rounded-full bg-wm-tint px-2 py-[3px] text-[11px] font-bold text-wm-blue">
          {t("sponsor")}
        </span>
      </Link>
      {company ? (
        <div className="flex items-center gap-3 rounded-[18px] bg-wm-land p-3">
          {company.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- small public logo
            <img src={company.logoUrl} alt="" className="size-11 shrink-0 rounded-[14px] object-cover" />
          ) : (
            <Avatar name={company.name} size={44} kind="company" />
          )}
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-extrabold">{company.name}</span>
            {company.approved ? (
              <span className="flex items-center gap-[5px] text-xs font-semibold text-wm-ok">
                <span className="size-[7px] rounded-full bg-[#12B76A]" aria-hidden="true" />
                {t("activeSponsor")}
              </span>
            ) : (
              <span className="text-xs font-semibold text-wm-caption">{t("notActive")}</span>
            )}
          </span>
        </div>
      ) : null}
      {company?.approved ? (
        <>
          <Link href="/sponsor/jobs/new" className={cn(btn("primary"), "w-full")}>
            <WmIcon name="plus" size={17} stroke={2.2} />
            {t("postJob")}
          </Link>
          <nav aria-label="Sponsor" className="flex flex-col gap-1">
            {nav.map((item) => {
              const on = active(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={on ? "page" : undefined}
                  aria-label={item.aria}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-[14px] px-3 text-sm no-underline",
                    on
                      ? "bg-wm-blue font-bold text-white shadow-[0_6px_16px_rgba(36,87,245,0.28)]"
                      : "font-semibold text-wm-body hover:bg-wm-mist",
                  )}
                >
                  <WmIcon name={item.icon} size={19} stroke={2} />
                  {item.label}
                  {item.count ? (
                    <span
                      className={cn(
                        "ms-auto rounded-full px-2 py-px text-xs font-extrabold",
                        on
                          ? "bg-white text-wm-blue"
                          : item.tone === "warn"
                            ? "bg-wm-warn-bg text-wm-warn"
                            : "bg-[#EEF0F4] text-wm-slate",
                      )}
                    >
                      {item.count}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
          <Link
            href="/sponsor/account#ecoins"
            className="flex items-center gap-2.5 rounded-[14px] border border-wm-line px-3 py-2.5 text-sm font-semibold text-wm-body no-underline hover:bg-wm-mist"
            aria-label={t("coinsLabel", { count: company.balance })}
          >
            <WmIcon name="coin" size={18} stroke={2} />
            {t("coins")}
            <span className="ms-auto font-extrabold text-wm-ink">{company.balance}</span>
          </Link>
        </>
      ) : null}
      <div className="mt-auto flex flex-col gap-3">
        <div className="flex flex-col gap-1.5 rounded-[18px] bg-wm-tint p-4">
          <span className="flex items-center gap-2 text-[13px] font-extrabold text-wm-blue-pressed">
            <WmIcon name="shieldCheck" size={16} stroke={2.2} />
            {t("howItWorks")}
          </span>
          <span className="text-xs leading-[1.5] font-medium text-wm-body">{t("howBody")}</span>
        </div>
        <div className="flex items-center gap-2.5 border-t border-[#EEF0F4] px-1.5 pt-3">
          <Avatar name={person} kind="admin" />
          <span className="flex min-w-0 grow flex-col">
            <span className="truncate text-[13px] font-bold">{person}</span>
            <span className="text-xs font-medium text-wm-caption">{t("owner")}</span>
          </span>
          <form action={signOut}>
            <button
              type="submit"
              aria-label={t("signOut")}
              className="flex size-[38px] items-center justify-center rounded-xl bg-wm-mist text-wm-body hover:bg-wm-track"
            >
              <WmIcon name="logout" size={17} stroke={2.1} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="wm-ui flex min-h-dvh bg-wm-land font-sans text-wm-ink">
      <aside className="hidden w-[264px] shrink-0 border-r border-wm-line bg-white lg:block">
        <div className="sticky top-0 h-dvh">{sidebar}</div>
      </aside>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Sponsor">
          <button
            type="button"
            aria-label={t("closeMenu")}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[rgba(11,18,32,0.35)]"
          />
          <aside className="absolute inset-y-0 left-0 w-[264px] overflow-y-auto border-r border-wm-line bg-white shadow-wm-3">
            {sidebar}
          </aside>
        </div>
      ) : null}
      <div className="flex min-w-0 grow flex-col">
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2.5 border-b border-wm-line bg-white/70 px-4 backdrop-blur sm:px-8">
          <button
            type="button"
            aria-label={t("openMenu")}
            onClick={() => setOpen(true)}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-wm-line bg-white text-wm-ink lg:hidden"
          >
            <WmIcon name="menu" size={18} stroke={2.1} />
          </button>
          <div id={CRUMBS_ID} className="flex min-w-0 items-center gap-2.5 overflow-hidden" />
          <Link
            href="/"
            className="ms-auto hidden items-center gap-1.5 text-[13px] font-bold whitespace-nowrap text-wm-blue no-underline sm:flex"
          >
            <WmIcon name="pin" size={15} stroke={2.2} />
            {t("seeOnMap")}
          </Link>
          {company?.approved && company.newCandidates ? (
            // Phones: the sidebar is a drawer, so new candidates get a bell here.
            <Link
              href="/sponsor/candidates"
              aria-label={tc("newCandidates", { count: company.newCandidates })}
              className="relative ms-auto flex size-10 shrink-0 items-center justify-center rounded-xl border border-wm-line bg-white text-wm-ink no-underline sm:ms-0 lg:hidden"
            >
              <WmIcon name="inbox" size={18} stroke={2.1} />
              <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-wm-warn px-1 text-[10px] font-extrabold text-white">
                {company.newCandidates}
              </span>
            </Link>
          ) : null}
        </header>
        <main className="flex min-w-0 grow flex-col gap-6 px-4 pt-7 pb-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}

const noSubscribe = () => () => {};

// The page trail in the top bar ("Your jobs › Barista › Sara"). Pages render
// it where they like; it shows up in the shell's top bar.
export function Crumbs({ items }: { items: { label: string; href?: string }[] }) {
  const target = useSyncExternalStore(
    noSubscribe,
    () => document.getElementById(CRUMBS_ID),
    () => null,
  );
  if (!target) return null;
  return createPortal(
    <>
      {items.map((c, i) => (
        <span key={i} className="flex min-w-0 items-center gap-2.5">
          {i ? (
            <span className="flex text-[#A0A9B8]" aria-hidden="true">
              <WmIcon name="chevronRight" size={14} stroke={2.4} />
            </span>
          ) : null}
          {c.href ? (
            <Link href={c.href} className="truncate text-[13px] font-semibold text-wm-caption no-underline">
              {c.label}
            </Link>
          ) : (
            <span className="truncate text-[13px] font-bold text-wm-ink">{c.label}</span>
          )}
        </span>
      ))}
    </>,
    target,
  );
}
