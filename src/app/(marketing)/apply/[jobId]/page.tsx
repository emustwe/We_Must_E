import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ApplyWizard } from "@/components/apply/apply-wizard";
import { JobClosed } from "@/components/apply/job-closed";
import { getApplyView, getJobSummary } from "@/server/public-application";
import { idSchema } from "@/lib/validations/jobs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("apply");
  // Application pages are private to the visitor: keep them out of search.
  return { title: t("title"), robots: { index: false, follow: false } };
}

// The 3-step application: test, video, then survey and consent. State lives
// on the server, keyed by the httpOnly cookie for this job.
export default async function ApplyPage({ params }: PageProps<"/apply/[jobId]">) {
  const { jobId } = await params;
  if (!idSchema.safeParse(jobId).success) notFound();
  const view = await getApplyView(jobId);
  const job = await getJobSummary(jobId, view.stage !== "start");
  if (!job) return <JobClosed />;
  return <ApplyWizard jobId={jobId} job={job} view={view} />;
}
