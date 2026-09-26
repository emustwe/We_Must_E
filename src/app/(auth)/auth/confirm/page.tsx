import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { confirmEmailLink } from "@/actions/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("confirmLink");
  return { title: t("title"), robots: { index: false, follow: false } };
}

// Landing point for links in Supabase Auth emails. Opening the link only shows
// this page; the one-time token is used when the person presses Continue (a
// POST). So a link sent by someone else can't silently sign a visitor into
// the sender's account, and email scanners that open links don't use it up.
export default async function ConfirmLinkPage({ searchParams }: PageProps<"/auth/confirm">) {
  const query = await searchParams;
  const t = await getTranslations("confirmLink");
  const value = (key: string) => {
    const v = query[key];
    return typeof v === "string" ? v.slice(0, 512) : "";
  };
  return (
    <AuthShell title={t("title")} subtitle={t("body")}>
      <form action={confirmEmailLink}>
        <input type="hidden" name="token_hash" value={value("token_hash")} />
        <input type="hidden" name="type" value={value("type")} />
        <input type="hidden" name="code" value={value("code")} />
        <button type="submit" className={cn(buttonVariants({ size: "touch" }), "w-full")}>
          {t("continue")}
        </button>
      </form>
    </AuthShell>
  );
}
