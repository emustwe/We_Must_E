import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";

export async function JobClosed() {
  const t = await getTranslations("apply");
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <span className="text-5xl" aria-hidden="true">
        📍
      </span>
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{t("jobClosedTitle")}</h1>
      <p className="mt-2 text-muted-foreground">{t("jobClosedBody")}</p>
      <Link href="/" className={buttonVariants({ size: "touch", className: "mt-6 w-full" })}>
        {t("moreJobs")}
      </Link>
    </main>
  );
}
