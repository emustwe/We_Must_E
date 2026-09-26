import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/admin/wm";
import { JobForm } from "@/components/employer/job-form";
import { Crumbs } from "@/components/sponsors/sponsor-shell";
import { jobAreaBounds } from "@/lib/jobs/area";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("jobForm");
  return { title: t("newTitle") };
}

export default async function NewJobPage() {
  const t = await getTranslations("jobForm");
  const te = await getTranslations("employerJob");
  return (
    <>
      <Crumbs items={[{ label: te("back"), href: "/sponsor" }, { label: t("newTitle") }]} />
      <PageHeader title={t("newTitle")} />
      <div className="max-w-3xl rounded-3xl bg-white p-6 shadow-wm-1 sm:p-8">
        <JobForm bounds={jobAreaBounds()} />
      </div>
    </>
  );
}
