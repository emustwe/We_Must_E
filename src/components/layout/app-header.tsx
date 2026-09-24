import { LogOut } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { signOut } from "@/actions/auth";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export async function AppHeader({ homeHref }: { homeHref: string }) {
  const tc = await getTranslations("common");
  const tb = await getTranslations("brand");
  return (
    <header className="border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link
          href={homeHref}
          aria-label={tb("home")}
          className="rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <Logo />
        </Link>
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="touch" className="text-sm">
            <LogOut className="size-4 rtl:-scale-x-100" aria-hidden="true" />
            {tc("signOut")}
          </Button>
        </form>
      </div>
    </header>
  );
}
