import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { JobForm } from "@/components/employer/job-form";
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
    <div className="mx-auto max-w-2xl pt-2">
      <h1 className="mb-2 text-3xl font-extrabold tracking-tight">{t("editTitle")}</h1>
      {job.status === "published" ? (
        <p className="mb-6 text-sm text-muted-foreground">{te("editNote")}</p>
      ) : (
        <div className="mb-6" />
      )}
      <div className="shadow-float rounded-[2rem] bg-card p-5 sm:p-8">
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
    </div>
  );
}
