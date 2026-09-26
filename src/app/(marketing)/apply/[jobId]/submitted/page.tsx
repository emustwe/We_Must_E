import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ClearDraft } from "@/components/apply/clear-draft";
import { RetentionNote } from "@/components/apply/retention-note";
import { TrustLines } from "@/components/explore/trust-lines";
import { buttonVariants } from "@/components/ui/button";
import { idSchema } from "@/lib/validations/jobs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("apply");
  return { title: t("submittedTitle"), robots: { index: false, follow: false } };
}

// Shown after sending. Nothing is sent to the employer at this point: the
// Wemuste team reviews the application first.
export default async function SubmittedPage({ params }: PageProps<"/apply/[jobId]/submitted">) {
  const { jobId } = await params;
  if (!idSchema.safeParse(jobId).success) notFound();
  const t = await getTranslations("apply");
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 py-10 text-center">
      <ClearDraft jobId={jobId} />
      <CheckCircle2 className="size-16 text-success" aria-hidden="true" />
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight">{t("submittedTitle")}</h1>
      <p className="mt-3 text-lg text-muted-foreground">{t("submittedBody")}</p>
      <p className="mt-6 rounded-3xl bg-muted/60 p-4 text-sm">{t("submittedNote")}</p>
      <TrustLines className="mt-6 self-start text-start text-muted-foreground" />
      <RetentionNote className="mt-4 text-start" />
      <Link href="/" className={buttonVariants({ size: "touch", className: "mt-8 w-full" })}>
        {t("moreJobs")}
      </Link>
    </main>
  );
}
