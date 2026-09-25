"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";
import { adminSearch, type SearchHit } from "@/actions/admin-search";
import { signOut } from "@/actions/auth";
import { Avatar } from "@/components/admin/wm";
import { WmIcon, type IconName } from "@/components/map/wm-icons";
import { cn } from "@/lib/utils";

type Counts = { applications: number; jobs: number };

type NavKey = "overview" | "applications" | "jobs" | "sponsors" | "content" | "audit";
const NAV: { href: string; key: NavKey; icon: IconName; count?: keyof Counts; exact?: boolean }[] =
  [
    { href: "/admin", key: "overview", icon: "home", exact: true },
    { href: "/admin/applications", key: "applications", icon: "inbox", count: "applications" },
    { href: "/admin/jobs", key: "jobs", icon: "pin", count: "jobs" },
    { href: "/admin/sponsors", key: "sponsors", icon: "building" },
    { href: "/admin/content", key: "content", icon: "fileText" },
    { href: "/admin/audit", key: "audit", icon: "shieldClock" },
  ];

// The admin console shell (reference/admin/*.html): a 264px sidebar, a 64px
// top bar with search, and the page. On phones the sidebar is a drawer.
export function AdminShell({
  counts,
  name,
  children,
}: {
  counts: Counts;
  name: string;
  children: ReactNode;
}) {
  const t = useTranslations("adminUi");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer after navigating.
  useEffect(() => {
    const id = window.setTimeout(() => setOpen(false), 0);
    return () => window.clearTimeout(id);
  }, [pathname]);

  const sidebar = (
    <div className="flex h-full flex-col gap-6 px-4 py-5">
      <Link
        href="/admin"
        className="flex items-center gap-[11px] px-1.5 py-1 text-wm-ink no-underline"
      >
        <span className="flex size-10 items-center justify-center rounded-[13px] bg-wm-blue text-[21px] font-extrabold text-white shadow-[inset_0_-3px_0_rgba(0,0,0,0.12)]">
          W
        </span>
        <span className="flex flex-col">
          <span className="text-lg leading-[1.15] font-extrabold tracking-[-0.4px]">Wemuste</span>
          <span className="text-xs font-semibold text-wm-caption">{t("console")}</span>
        </span>
      </Link>
      <nav aria-label="Admin" className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const count = item.count ? counts[item.count] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-[14px] px-3 text-sm no-underline",
                active
                  ? "bg-wm-blue font-bold text-white shadow-[0_6px_16px_rgba(36,87,245,0.28)]"
                  : "font-semibold text-wm-body hover:bg-wm-mist",
              )}
            >
              <WmIcon name={item.icon} size={19} stroke={2} />
              {t(`nav.${item.key}`)}
              {count > 0 ? (
                <span
                  className={cn(
                    "ms-auto flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-[7px] text-xs font-extrabold",
                    active ? "bg-white text-wm-blue" : "bg-wm-warn-bg text-wm-warn",
                  )}
                >
                  <span className="sr-only">{t("waiting")}: </span>
                  {count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-3">
        <a
          href="/"
          target="_blank"
          rel="noopener"
          className="flex items-center gap-2.5 rounded-2xl bg-wm-tint p-3.5 text-[13px] font-bold text-wm-blue-pressed no-underline"
        >
          <WmIcon name="pin" size={17} stroke={2.1} />
          {t("openMap")}
          <span className="ms-auto flex">
            <WmIcon name="external" size={15} stroke={2.2} />
          </span>
        </a>
        <div className="flex items-center gap-2.5 border-t border-[#EEF0F4] px-1.5 pt-2">
          <Avatar name={name} kind="admin" className="mt-2.5" />
          <span className="mt-2.5 flex min-w-0 grow flex-col">
            <span className="truncate text-[13px] font-bold">{name}</span>
            <span className="text-xs font-medium text-wm-caption">{t("administrator")}</span>
          </span>
          <form action={signOut}>
            <button
              type="submit"
              aria-label={t("signOut")}
              className="mt-2.5 flex size-[38px] items-center justify-center rounded-xl bg-wm-mist text-wm-body hover:bg-wm-track"
            >
              <WmIcon name="logout" size={17} stroke={2.1} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh bg-wm-land">
      <aside className="hidden w-[264px] shrink-0 border-r border-wm-line bg-white lg:block">
        <div className="sticky top-0 h-dvh">{sidebar}</div>
      </aside>
      {open ? (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Admin"
        >
          <button
            type="button"
            aria-label={t("closeMenu")}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[rgba(11,18,32,0.35)]"
          />
          <aside className="absolute inset-y-0 left-0 w-[264px] border-r border-wm-line bg-white shadow-wm-3">
            {sidebar}
          </aside>
        </div>
      ) : null}
      <div className="flex min-w-0 grow flex-col">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-wm-line bg-white/70 px-4 backdrop-blur sm:gap-4 sm:px-8">
          <button
            type="button"
            aria-label={t("openMenu")}
            onClick={() => setOpen(true)}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-wm-line bg-white text-wm-ink lg:hidden"
          >
            <WmIcon name="menu" size={18} stroke={2.1} />
          </button>
          <GlobalSearch />
          <span className="ms-auto hidden items-center gap-2 text-[13px] font-semibold whitespace-nowrap text-wm-trust sm:flex">
            <span className="size-2 rounded-full bg-[#12B76A]" aria-hidden="true" />
            {t("mapLive")}
          </span>
        </div>
        <main className="flex min-w-0 grow flex-col gap-6 px-4 pt-7 pb-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}

const KIND_ICON: Record<SearchHit["kind"], IconName> = {
  applicant: "inbox",
  job: "pin",
  sponsor: "building",
};

function GlobalSearch() {
  const t = useTranslations("adminUi");
  const router = useRouter();
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [pending, startTransition] = useTransition();

  // Ctrl K / Cmd K focuses the search from anywhere in the admin.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
        setOpen(true);
      }
    };
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, []);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) return;
    const id = window.setTimeout(() => {
      startTransition(async () => {
        const result = await adminSearch(query);
        setHits(result.ok ? result.data : []);
        setActive(-1);
      });
    }, 250);
    return () => window.clearTimeout(id);
  }, [q]);

  const shown = q.trim().length >= 2 ? hits : [];
  const go = (hit: SearchHit) => {
    setOpen(false);
    setQ("");
    router.push(hit.href);
  };

  return (
    <div ref={box} className="relative min-w-0 grow sm:max-w-[420px]">
      <label className="flex h-[42px] items-center gap-2.5 rounded-[14px] border border-wm-line bg-white px-3.5 text-wm-caption">
        <WmIcon name="search" size={17} stroke={2.2} />
        <span className="sr-only">{t("search")}</span>
        <input
          ref={input}
          type="search"
          role="combobox"
          aria-expanded={open && shown.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          value={q}
          placeholder={t("searchPlaceholder")}
          autoComplete="off"
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, shown.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const hit = shown[active >= 0 ? active : 0];
              if (hit) go(hit);
            } else if (e.key === "Escape") {
              setOpen(false);
              input.current?.blur();
            }
          }}
          className="min-w-0 grow border-0 bg-transparent text-sm text-wm-ink outline-none focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        <kbd className="hidden rounded-md border border-wm-line px-1.5 py-0.5 font-sans text-[11px] font-bold text-wm-caption sm:inline">
          Ctrl K
        </kbd>
      </label>
      {open && q.trim().length >= 2 ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={t("search")}
          className="absolute inset-x-0 top-full z-50 mt-2 max-h-[70dvh] overflow-y-auto rounded-2xl bg-white py-2 shadow-wm-2"
        >
          {shown.length === 0 ? (
            <li className="px-4 py-3 text-sm text-wm-caption">
              {pending ? t("searching") : t("noResults")}
            </li>
          ) : null}
          {shown.map((hit, i) => (
            <li
              key={hit.href}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => go(hit)}
              className={cn(
                "flex cursor-pointer items-center gap-3 px-4 py-2.5",
                i === active ? "bg-wm-mist" : "hover:bg-wm-mist",
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-wm-tint text-wm-blue">
                <WmIcon name={KIND_ICON[hit.kind]} size={16} stroke={2.1} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">{hit.title}</span>
                <span className="block truncate text-xs font-medium text-wm-caption">
                  {t(`kind.${hit.kind}`)}
                  {hit.sub ? ` · ${hit.sub}` : ""}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
