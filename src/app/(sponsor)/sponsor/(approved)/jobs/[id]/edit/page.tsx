import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/admin/wm";
import { JobForm } from "@/components/employer/job-form";
import { Crumbs } from "@/components/sponsors/sponsor-shell";
import { jobAreaBounds } from "@/lib/jobs/area";
import { getOwnJob } from "@/lib/jobs/employer-queries";
import { idSchema } from "@/lib/validations/jobs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("jobForm");
  return { title: t("editTitle") };
}

export default async function EditJobPage({ params }: PageProps<"/sponsor/jobs/[id]/edit">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const job = await getOwnJob(id);
  if (!["pending", "published", "closed", "rejected"].includes(job.status)) notFound();
  const t = await getTranslations("jobForm");
  const te = await getTranslations("employerJob");

  return (
    <>
      <Crumbs
        items={[
          { label: te("back"), href: "/sponsor" },
          { label: job.title, href: `/sponsor/jobs/${job.id}` },
          { label: t("editTitle") },
        ]}
      />
      <PageHeader
        title={t("editTitle")}
        body={job.status === "published" ? te("editNote") : undefined}
      />
      <div className="max-w-3xl rounded-3xl bg-white p-6 shadow-wm-1 sm:p-8">
        <JobForm
          jobId={job.id}
          bounds={jobAreaBounds()}
          defaults={{
            title: job.title,
            description: job.description,
            locationLabel: job.location_label,
            lat: job.lat,
            lng: job.lng,
            countryCode: job.country_code ?? "",
            city: job.city ?? "",
          }}
        />
      </div>
    </>
  );
}
