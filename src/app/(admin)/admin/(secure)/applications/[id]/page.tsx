import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ApplicationsView } from "@/components/admin/applications-view";
import { idSchema } from "@/lib/validations/jobs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("applicationTitle") };
}

// The same split view, with this application open in the review panel.
export default async function ApplicationPage({
  params,
  searchParams,
}: PageProps<"/admin/applications/[id]">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  return <ApplicationsView params={await searchParams} selectedId={id} />;
}
