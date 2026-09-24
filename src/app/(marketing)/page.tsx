import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { JobExplorer } from "@/components/explore/job-explorer";
import { jobAreaBounds } from "@/lib/jobs/area";
import { getPublicJobs } from "@/lib/jobs/public-queries";
import { idSchema } from "@/lib/validations/jobs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("explore");
  return { title: { absolute: t("metaTitle") }, description: t("metaDescription") };
}

// The public home: a full-screen map of live jobs. No account needed.
export default async function ExplorePage({ searchParams }: PageProps<"/">) {
  const { job } = await searchParams;
  const initialJobId = typeof job === "string" && idSchema.safeParse(job).success ? job : null;
  const jobs = await getPublicJobs();
  return <JobExplorer jobs={jobs} bounds={jobAreaBounds()} initialJobId={initialJobId} />;
}
