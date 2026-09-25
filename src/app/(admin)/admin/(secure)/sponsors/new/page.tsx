import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CreateEmployerForm } from "@/components/admin/create-employer-form";
import { PageHeader } from "@/components/admin/wm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("createTitle") };
}

export default async function CreateEmployerPage() {
  const t = await getTranslations("admin");
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <PageHeader title={t("createTitle")} body={t("createBody")} />
      <div className="rounded-3xl bg-white p-5 shadow-wm-1 sm:p-8">
        <CreateEmployerForm />
      </div>
    </div>
  );
}
