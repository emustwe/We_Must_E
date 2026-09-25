import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ApplicationsView } from "@/components/admin/applications-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("applicationsTitle") };
}

export default async function ApplicationsPage({ searchParams }: PageProps<"/admin/applications">) {
  return <ApplicationsView params={await searchParams} selectedId={null} />;
}
