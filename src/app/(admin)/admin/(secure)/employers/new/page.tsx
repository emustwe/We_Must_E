import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CreateEmployerForm } from "@/components/admin/create-employer-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("createTitle") };
}

export default async function CreateEmployerPage() {
  const t = await getTranslations("admin");
  return (
    <div className="mx-auto max-w-xl pt-2">
      <h1 className="text-3xl font-extrabold tracking-tight">{t("createTitle")}</h1>
      <p className="mt-1 mb-6 text-muted-foreground">{t("createBody")}</p>
      <div className="shadow-float rounded-[2rem] bg-card p-5 sm:p-8">
        <CreateEmployerForm />
      </div>
    </div>
  );
}
