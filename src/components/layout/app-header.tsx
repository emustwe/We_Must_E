import { LogOut } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { signOut } from "@/actions/auth";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export async function AppHeader({
  homeHref,
  subtitle,
  actions,
}: {
  homeHref: string;
  subtitle?: string | null;
  // Extra controls before "Sign out" (e.g. the sponsor's coins and alerts).
  actions?: ReactNode;
}) {
  const tc = await getTranslations("common");
  const tb = await getTranslations("brand");
  return (
    <header className="sticky top-0 z-30 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href={homeHref}
          aria-label={tb("home")}
          className="flex min-w-0 items-center gap-3 rounded-full focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <Logo />
          {subtitle ? (
            <span className="hidden truncate rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground sm:inline">
              {subtitle}
            </span>
          ) : null}
        </Link>
        <div className="flex items-center gap-1.5">
          {actions}
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="pill">
              <LogOut className="size-4 rtl:-scale-x-100" aria-hidden="true" />
              <span className="hidden sm:inline">{tc("signOut")}</span>
              <span className="sr-only sm:hidden">{tc("signOut")}</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
