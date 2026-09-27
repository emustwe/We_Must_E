import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CreateEmployerForm } from "@/components/admin/create-employer-form";
import { PageHeader } from "@/components/admin/wm";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validations/jobs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("createTitle") };
}

export default async function CreateEmployerPage({
  searchParams,
}: PageProps<"/admin/sponsors/new">) {
  const t = await getTranslations("admin");
  const tu = await getTranslations("adminUi");
  const query = await searchParams;
  // From a "Become a sponsor" request: its details fill the form.
  const requestId =
    typeof query.request === "string" && idSchema.safeParse(query.request).success
      ? query.request
      : null;
  const { data: request } = requestId
    ? await (
        await createClient()
      )
        .from("sponsor_requests")
        .select("id, company_name, contact_person, email, phone, website, status")
        .eq("id", requestId)
        .eq("status", "new")
        .maybeSingle()
    : { data: null };
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <PageHeader title={t("createTitle")} body={t("createBody")} />
      <div className="rounded-3xl bg-white p-5 shadow-wm-1 sm:p-8">
        {request ? (
          <p className="mb-4 rounded-xl bg-wm-tint p-3 text-sm font-semibold text-wm-blue">
            {tu("requestCreatedNote")}
          </p>
        ) : null}
        <CreateEmployerForm
          request={
            request
              ? {
                  id: request.id,
                  companyName: request.company_name,
                  contactPerson: request.contact_person,
                  email: request.email,
                  phone: request.phone,
                  website: request.website ?? "",
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
