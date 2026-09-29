import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ApplicationJobs } from "@/components/admin/application-jobs";
import { ApplicationsView } from "@/components/admin/applications-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("applicationsTitle") };
}

// First the jobs with applications; a job (or any filter) opens its list.
export default async function ApplicationsPage({ searchParams }: PageProps<"/admin/applications">) {
  const params = await searchParams;
  const filtered = ["job", "sponsor", "area", "date", "status"].some((k) => params[k]);
  if (!filtered) return <ApplicationJobs />;
  return <ApplicationsView params={params} selectedId={null} />;
}
