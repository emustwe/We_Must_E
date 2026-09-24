import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { JobForm } from "@/components/employer/job-form";
import { jobAreaBounds } from "@/lib/jobs/area";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("jobForm");
  return { title: t("newTitle") };
}

export default async function NewJobPage() {
  const t = await getTranslations("jobForm");
  return (
    <div className="mx-auto max-w-2xl pt-2">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">{t("newTitle")}</h1>
      <div className="shadow-float rounded-[2rem] bg-card p-5 sm:p-8">
        <JobForm bounds={jobAreaBounds()} />
      </div>
    </div>
  );
}
