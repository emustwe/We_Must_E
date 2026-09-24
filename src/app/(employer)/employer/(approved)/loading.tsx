import { getTranslations } from "next-intl/server";
import { ListSkeleton } from "@/components/layout/skeletons";

export default async function Loading() {
  const t = await getTranslations("common");
  return <ListSkeleton label={t("loading")} />;
}
