import { getTranslations } from "next-intl/server";
import { MapSkeleton } from "@/components/layout/skeletons";

export default async function Loading() {
  const t = await getTranslations("common");
  return <MapSkeleton label={t("loading")} />;
}
