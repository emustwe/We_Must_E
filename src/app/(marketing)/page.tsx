import { ArrowRight, BriefcaseBusiness, Lock, Search } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function LandingPage() {
  const t = await getTranslations("landing");
  const tc = await getTranslations("common");
  const tb = await getTranslations("brand");

  const steps = [
    { title: t("step1Title"), body: t("step1Body") },
    { title: t("step2Title"), body: t("step2Body") },
    { title: t("step3Title"), body: t("step3Body") },
  ];
  const roles = [
    {
      href: "/signup/employee",
      icon: Search,
      title: t("employeeCardTitle"),
      body: t("employeeCardBody"),
      tone: "bg-primary text-primary-foreground",
    },
    {
      href: "/signup/employer",
      icon: BriefcaseBusiness,
      title: t("employerCardTitle"),
      body: t("employerCardBody"),
      tone: "bg-brand-accent text-brand-accent-foreground",
    },
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Link
          href="/"
          aria-label={tb("home")}
          className="rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <Logo />
        </Link>
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "ghost", size: "touch" }), "text-sm")}
        >
          {tc("logIn")}
        </Link>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-12 sm:px-6">
        <section className="pt-6 pb-8 text-center sm:pt-12 sm:pb-10">
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Lock className="size-3.5" aria-hidden="true" />
            {t("eyebrow")}
          </p>
          <h1 className="mx-auto max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {t("headline")}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
            {t("subhead")}
          </p>
        </section>

        <section aria-labelledby="how-title" className="mb-10">
          <h2 id="how-title" className="sr-only">
            {t("howTitle")}
          </h2>
          <ol className="grid gap-3 sm:grid-cols-3">
            {steps.map((step, i) => (
              <li
                key={step.title}
                className="flex gap-3 rounded-xl bg-muted/60 p-4 sm:flex-col sm:gap-2"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-background text-sm font-semibold text-primary ring-1 ring-border">
                  {i + 1}
                </span>
                <span>
                  <span className="block text-sm font-semibold">{step.title}</span>
                  <span className="block text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="choose-title">
          <h2
            id="choose-title"
            className="mb-4 text-center text-base font-medium text-muted-foreground"
          >
            {t("chooseTitle")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {roles.map((role) => (
              <Link
                key={role.href}
                href={role.href}
                className="group flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-sm transition-[box-shadow,border-color,transform] duration-150 hover:border-primary/40 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:scale-[0.99] sm:flex-col sm:items-start sm:p-7"
              >
                <span
                  className={cn(
                    "flex size-12 shrink-0 items-center justify-center rounded-xl sm:size-14",
                    role.tone,
                  )}
                >
                  <role.icon className="size-6" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold sm:text-xl">{role.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {role.body}
                  </span>
                </span>
                <ArrowRight
                  className="size-5 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary sm:self-end rtl:-scale-x-100"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("haveAccount")}{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              {tc("logIn")}
            </Link>
          </p>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-3 px-4 py-6 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6 sm:text-start">
          <p className="inline-flex items-center gap-1.5">
            <Lock className="size-3.5" aria-hidden="true" />
            {t("trustLine")}
          </p>
          <nav className="flex gap-5">
            <Link href="/privacy" className="hover:text-foreground">
              {tc("privacy")}
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              {tc("terms")}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
