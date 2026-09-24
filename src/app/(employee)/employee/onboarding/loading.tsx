import { getTranslations } from "next-intl/server";
import { ListSkeleton } from "@/components/layout/skeletons";

export default async function Loading() {
  const t = await getTranslations("common");
  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-24 sm:px-6">
      <ListSkeleton rows={2} label={t("loading")} />
    </main>
  );
}
