import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { WmIcon, type IconName } from "@/components/map/wm-icons";
import { MapBackdrop } from "@/components/map/map-backdrop";

// Auth screens in the Wemuste design (like the map and the portals): the map
// behind, the W logo pill, and one white card; a trust panel beside it on
// desktop, a bottom sheet on phones.
export async function AuthShell({
  title,
  subtitle,
  children,
  footer,
  aside,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  // Replaces the trust panel on the left (desktop; above the card on phones),
  // and both cards line up at the top.
  aside?: ReactNode;
}) {
  const t = await getTranslations("authShell");
  const tc = await getTranslations("common");
  const tb = await getTranslations("brand");
  const tl = await getTranslations("landing");
  const points: { icon: IconName; text: string }[] = [
    { icon: "lock", text: t("trust1") },
    { icon: "shieldCheck", text: t("trust2") },
    { icon: "checklist", text: t("trust3") },
  ];

  return (
    <div className="wm-ui relative flex min-h-dvh flex-col bg-wm-land font-sans text-wm-ink">
      <MapBackdrop alt={tl("mapAlt")} pins={false} />

      <header className="relative z-10 flex items-center justify-between px-4 pt-4 sm:px-6 sm:pt-6">
        <Link
          href="/"
          aria-label={tb("home")}
          className="flex items-center gap-2.5 rounded-[20px] bg-white py-2 ps-2 pe-4 no-underline shadow-wm-2"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-wm-blue text-lg font-extrabold text-white">
            W
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-[17px] font-extrabold tracking-[-0.4px] text-wm-ink">
              Wemuste
            </span>
            <span className="text-[11px] font-medium text-wm-slate">{t("tagline")}</span>
          </span>
        </Link>
        <span className="hidden items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-wm-ink shadow-wm-2 sm:inline-flex">
          <span className="text-wm-trust">
            <WmIcon name="lock" size={14} stroke={2.2} />
          </span>
          {tc("neverPublic")}
        </span>
      </header>

      <div
        className={`relative z-10 mt-6 flex flex-1 items-end justify-center gap-8 sm:mt-0 sm:items-center sm:px-6 sm:py-10 lg:justify-end lg:px-16 ${aside ? "lg:items-start" : ""}`}
      >
        <aside
          className={`hidden rounded-[28px] bg-white/95 p-7 shadow-wm-2 backdrop-blur lg:block ${aside ? "max-w-md" : "max-w-sm"}`}
        >
          {aside ?? (
            <>
              <h2 className="m-0 text-2xl leading-tight font-extrabold tracking-[-0.6px]">
                {t("valueTitle")}
              </h2>
              <ul className="m-0 mt-5 flex list-none flex-col gap-3 p-0">
                {points.map(({ icon, text }) => (
                  <li
                    key={text}
                    className="flex items-center gap-3 text-sm font-semibold text-wm-body"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-wm-tint text-wm-blue">
                      <WmIcon name={icon} size={17} stroke={2.2} />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>

        <main className="w-full rounded-t-[28px] bg-white px-5 pt-3 pb-6 shadow-wm-3 sm:max-w-md sm:rounded-[28px] sm:p-8">
          <div
            className="mx-auto mb-5 h-[5px] w-10 rounded-full bg-[rgba(11,18,32,0.18)] sm:hidden"
            aria-hidden="true"
          />
          {aside ? (
            <div className="mb-6 border-b border-wm-line pb-6 lg:hidden">{aside}</div>
          ) : null}
          <div className="mb-6 flex flex-col gap-1.5">
            <h1 className="m-0 text-[28px] leading-tight font-extrabold tracking-[-0.8px] text-balance">
              {title}
            </h1>
            {subtitle ? (
              <p className="m-0 text-[15px] leading-relaxed font-medium text-wm-slate">
                {subtitle}
              </p>
            ) : null}
          </div>
          {children}
          {footer ? (
            <div className="mt-6 text-center text-sm font-medium text-wm-slate">{footer}</div>
          ) : null}
          <nav className="mt-6 flex justify-center gap-5 border-t border-wm-line pt-4 text-xs font-semibold text-wm-caption">
            <Link href="/privacy" className="text-inherit no-underline hover:text-wm-ink">
              {tc("privacy")}
            </Link>
            <Link href="/terms" className="text-inherit no-underline hover:text-wm-ink">
              {tc("terms")}
            </Link>
          </nav>
        </main>
      </div>
    </div>
  );
}
