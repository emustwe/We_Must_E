import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { JobExplorer } from "@/components/jobs/job-explorer";
import { requireRole } from "@/lib/auth/session";
import { getEmployeeStatus, listOpenJobs } from "@/lib/jobs/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tabs");
  return { title: t("map") };
}

export default async function EmployeeMapPage() {
  const profile = await requireRole("employee");
  const [jobs, status] = await Promise.all([listOpenJobs(), getEmployeeStatus(profile.id)]);
  return <JobExplorer jobs={jobs} profileReady={status === "submitted" || status === "approved"} />;
}
