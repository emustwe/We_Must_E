import { getTranslations } from "next-intl/server";

export default async function AdminHome() {
  const t = await getTranslations("admin");
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">{t("homeTitle")}</h1>
      <p className="text-muted-foreground">{t("homeBody")}</p>
    </div>
  );
}
