import { Lock, ShieldCheck, UserCheck } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { MapBackdrop } from "@/components/map/map-backdrop";

// Auth screens float over the map like the app itself: a bottom sheet on
// phones, a card beside a trust panel on desktop.
export async function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const t = await getTranslations("authShell");
  const tc = await getTranslations("common");
  const tb = await getTranslations("brand");
  const tl = await getTranslations("landing");
  const points = [
    { icon: Lock, text: t("trust1") },
    { icon: ShieldCheck, text: t("trust2") },
    { icon: UserCheck, text: t("trust3") },
  ];

  return (
    <div className="relative flex min-h-dvh flex-col">
      <MapBackdrop alt={tl("mapAlt")} pins={false} />
      <div className="pointer-events-none absolute inset-0 bg-background/10 lg:bg-transparent" />

      <header className="relative z-10 flex items-center justify-between px-4 pt-4 sm:px-6 sm:pt-6">
        <Link
          href="/"
          aria-label={tb("home")}
          className="shadow-float rounded-full bg-background py-1.5 ps-1.5 pe-4 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <Logo />
        </Link>
        <span className="shadow-float inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-2 text-xs font-semibold">
          <Lock className="size-3.5 text-success" aria-hidden="true" />
          {tc("neverPublic")}
        </span>
      </header>

      <div className="relative z-10 mt-6 flex flex-1 items-end justify-center gap-10 sm:mt-0 sm:items-center sm:px-6 sm:py-10 lg:justify-end lg:px-16">
        <aside className="shadow-float hidden max-w-sm rounded-[2rem] bg-background/95 p-7 backdrop-blur lg:block">
          <h2 className="text-2xl leading-tight font-extrabold tracking-tight">
            {t("valueTitle")}
          </h2>
          <ul className="mt-5 space-y-3">
            {points.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm font-medium">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </aside>

        <main className="shadow-float w-full rounded-t-[2rem] bg-background px-5 pt-3 pb-6 sm:max-w-md sm:rounded-[2rem] sm:p-8">
          <div
            className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-border sm:hidden"
            aria-hidden="true"
          />
          <div className="mb-6 space-y-1.5">
            <h1 className="text-[1.75rem] leading-tight font-extrabold tracking-tight text-balance">
              {title}
            </h1>
            {subtitle ? (
              <p className="text-base leading-relaxed text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {children}
          {footer ? (
            <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
          ) : null}
          <nav className="mt-6 flex justify-center gap-5 border-t pt-4 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">
              {tc("privacy")}
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              {tc("terms")}
            </Link>
          </nav>
        </main>
      </div>
    </div>
  );
}
