import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { JobForm } from "@/components/employer/job-form";
import { getOwnJob } from "@/lib/jobs/employer-queries";
import { expiryOptionFor, type CityId } from "@/lib/jobs/meta";
import { idSchema } from "@/lib/validations/jobs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("jobForm");
  return { title: t("editTitle") };
}

export default async function EditJobPage({ params }: PageProps<"/employer/jobs/[id]/edit">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const job = await getOwnJob(id);
  if (job.status === "removed") notFound();
  const t = await getTranslations("jobForm");
  const expiresInDays = expiryOptionFor(job.expires_at);

  return (
    <div className="mx-auto max-w-2xl pt-2">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">{t("editTitle")}</h1>
      <div className="shadow-float rounded-[2rem] bg-card p-5 sm:p-8">
        <JobForm
          jobId={job.id}
          defaults={{
            title: job.title,
            description: job.description,
            category: job.category,
            schedule: job.schedule,
            payMin: job.pay_min,
            payMax: job.pay_max ?? "",
            payPeriod: job.pay_period,
            spots: job.spots,
            cityEmirate: job.city_emirate as CityId,
            areaLabel: job.area_label,
            address: job.address ?? "",
            lat: job.lat,
            lng: job.lng,
            startsOn: job.starts_on ?? "",
            expiresInDays,
          }}
        />
      </div>
    </div>
  );
}
