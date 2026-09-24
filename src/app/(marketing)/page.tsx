import { ArrowRight, BriefcaseBusiness, Lock } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { MapBackdrop } from "@/components/map/map-backdrop";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function LandingPage() {
  const t = await getTranslations("landing");
  const tc = await getTranslations("common");
  const tb = await getTranslations("brand");

  const steps = [
    { emoji: "🙋", label: t("step1") },
    { emoji: "📍", label: t("step2") },
    { emoji: "🤝", label: t("step3") },
  ];

  return (
    <div className="relative flex min-h-dvh flex-col">
      <MapBackdrop alt={t("mapAlt")} />
      {/* Mobile: soften the top of the map behind the floating header. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background/70 to-transparent" />

      <header className="relative z-10 flex items-center justify-between px-4 pt-4 sm:px-6 sm:pt-6">
        <Link
          href="/"
          aria-label={tb("home")}
          className="shadow-float rounded-full bg-background py-1.5 ps-1.5 pe-4 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <Logo />
        </Link>
        <Link
          href="/login"
          className={cn(
            buttonVariants({ variant: "outline", size: "pill" }),
            "shadow-float border-transparent",
          )}
        >
          {tc("logIn")}
        </Link>
      </header>

      <main className="relative z-10 mt-auto flex flex-1 items-end sm:items-center sm:px-6 lg:px-12">
        <section className="animate-sheet shadow-float w-full rounded-t-[2rem] bg-background px-5 pt-3 pb-6 sm:max-w-lg sm:rounded-[2rem] sm:p-8">
          <div
            className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-border sm:hidden"
            aria-hidden="true"
          />
          <p className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
            <Lock className="size-3.5" aria-hidden="true" />
            {t("eyebrow")}
          </p>
          <h1 className="mt-3 text-[1.9rem] leading-[1.05] font-extrabold tracking-tight text-balance sm:mt-4 sm:text-5xl">
            {t("headline")}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("subhead")}
          </p>

          <ol className="mt-5 grid grid-cols-3 gap-2" aria-label={t("howTitle")}>
            {steps.map((step, i) => (
              <li key={step.label} className="rounded-2xl bg-muted/70 px-2.5 py-3 text-center">
                <span className="block text-xl" aria-hidden="true">
                  {step.emoji}
                </span>
                <span className="mt-1 block text-xs leading-snug font-semibold">
                  <span className="sr-only">{i + 1}. </span>
                  {step.label}
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-5 grid grid-cols-[1fr_auto] gap-2.5 sm:mt-6 sm:grid-cols-1 sm:gap-3">
            <Link
              href="/signup/employee"
              className={cn(buttonVariants({ size: "touch" }), "w-full text-base")}
            >
              {t("findWork")}
              <ArrowRight
                className="hidden size-4 min-[400px]:block rtl:-scale-x-100"
                aria-hidden="true"
              />
            </Link>
            <Link
              href="/for-employers"
              className={cn(buttonVariants({ variant: "secondary", size: "touch" }), "w-full")}
            >
              <BriefcaseBusiness className="size-4" aria-hidden="true" />
              {t("hiring")}
            </Link>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">{t("free")}</p>

          <div className="mt-4 flex flex-col items-center gap-2 border-t pt-3 text-center text-sm">
            <p className="text-muted-foreground">
              {t("haveAccount")}{" "}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                {tc("logIn")}
              </Link>
            </p>
            <p className="hidden text-xs text-muted-foreground sm:block">{t("trustLine")}</p>
            <nav className="flex gap-5 text-xs text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground">
                {tc("privacy")}
              </Link>
              <Link href="/terms" className="hover:text-foreground">
                {tc("terms")}
              </Link>
            </nav>
          </div>
        </section>
      </main>
    </div>
  );
}
