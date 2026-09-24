import { ArrowLeft, ClipboardCheck, ListChecks, Video } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { TrustLines } from "@/components/explore/job-explorer";
import { getPublicJobs } from "@/lib/jobs/public-queries";
import { idSchema } from "@/lib/validations/jobs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("apply");
  return { title: t("title") };
}

// Placeholder until the 3-step application (phase 4).
export default async function ApplyPage({ params }: PageProps<"/apply/[jobId]">) {
  const { jobId } = await params;
  if (!idSchema.safeParse(jobId).success) notFound();
  const job = (await getPublicJobs()).find((j) => j.id === jobId);
  if (!job) notFound();
  const t = await getTranslations("apply");
  const steps = [
    { icon: ListChecks, text: t("stepTest") },
    { icon: Video, text: t("stepVideo") },
    { icon: ClipboardCheck, text: t("stepSurvey") },
  ];

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 py-6">
      <Link
        href={`/?job=${job.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        {t("back")}
      </Link>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight">{job.title}</h1>
      <p className="mt-1 text-muted-foreground">{job.locationLabel}</p>
      <section className="shadow-float mt-6 rounded-[2rem] bg-card p-6">
        <h2 className="text-lg font-extrabold">{t("stepsTitle")}</h2>
        <ol className="mt-3 space-y-3">
          {steps.map(({ icon: Icon, text }, i) => (
            <li key={text} className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-muted">
                <Icon className="size-5 text-primary" aria-hidden="true" />
              </span>
              <span className="font-semibold">
                {i + 1}. {text}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-5 rounded-2xl bg-muted/70 p-4 text-sm">{t("comingSoon")}</p>
      </section>
      <TrustLines className="mt-6 text-muted-foreground" />
    </main>
  );
}
