import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  const tc = await getTranslations("common");
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="max-w-sm text-muted-foreground">{t("body")}</p>
      <Link href="/" className={buttonVariants({ size: "touch" })}>
        {tc("backHome")}
      </Link>
    </main>
  );
}
