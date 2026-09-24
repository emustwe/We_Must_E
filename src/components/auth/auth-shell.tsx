import { CheckCircle2, Lock, ShieldCheck, UserCheck } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";

type Audience = "employee" | "employer";

// Premium auth layout: brand panel + form card on desktop, full-screen form
// with a brand header on mobile.
export async function AuthShell({
  title,
  subtitle,
  audience = "employee",
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  audience?: Audience;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const t = await getTranslations("authShell");
  const tc = await getTranslations("common");
  const tb = await getTranslations("brand");

  const copy =
    audience === "employer"
      ? {
          title: t("employerValueTitle"),
          body: t("employerValueBody"),
          points: [t("employerTrust1"), t("employerTrust2"), t("employerTrust3")],
        }
      : {
          title: t("valueTitle"),
          body: t("valueBody"),
          points: [t("trust1"), t("trust2"), t("trust3")],
        };
  const icons = [Lock, ShieldCheck, UserCheck];

  return (
    <div className="flex min-h-dvh flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="bg-brand-mesh relative hidden overflow-hidden p-10 text-white lg:flex lg:flex-col xl:p-14">
        <Link
          href="/"
          aria-label={tb("home")}
          className="w-fit rounded-lg focus-visible:ring-3 focus-visible:ring-white/60 focus-visible:outline-none"
        >
          <Logo inverted />
        </Link>
        <div className="my-auto max-w-md space-y-6 py-12">
          <h2 className="text-3xl leading-tight font-semibold tracking-tight text-balance xl:text-4xl">
            {copy.title}
          </h2>
          <p className="text-base leading-relaxed text-white/80">{copy.body}</p>
          <ul className="space-y-4 pt-2">
            {copy.points.map((point, i) => {
              const Icon = icons[i] ?? CheckCircle2;
              return (
                <li key={point} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="pt-1 text-sm leading-relaxed text-white/90">{point}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="text-xs text-white/60">
          {tc("copyright", { year: new Date().getFullYear() })}
        </p>
      </aside>

      <main className="flex flex-1 flex-col">
        <header className="flex items-center justify-between px-4 pt-5 sm:px-8 lg:hidden">
          <Link
            href="/"
            aria-label={tb("home")}
            className="rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Logo />
          </Link>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3.5" aria-hidden="true" />
            {audience === "employer" ? t("employerBadge") : tc("neverPublic")}
          </span>
        </header>

        <div className="flex flex-1 items-start justify-center px-4 py-8 sm:px-8 sm:py-12 lg:items-center">
          <div className="animate-in-fast w-full max-w-md">
            <div className="mb-7 space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                {title}
              </h1>
              {subtitle ? (
                <p className="text-base leading-relaxed text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
            <div className="sm:rounded-2xl sm:border sm:bg-card sm:p-8 sm:shadow-sm">
              {children}
            </div>
            {footer ? (
              <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
            ) : null}
          </div>
        </div>

        <footer className="flex justify-center gap-5 px-4 pb-6 text-xs text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground">
            {tc("privacy")}
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            {tc("terms")}
          </Link>
        </footer>
      </main>
    </div>
  );
}
