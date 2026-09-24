import { Users } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function EmployerHome() {
  const t = await getTranslations("employer");
  return (
    <div className="animate-in-fast space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("homeTitle")}</h1>
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-10 text-center">
        <Users className="size-8 text-muted-foreground" aria-hidden="true" />
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{t("homeEmpty")}</p>
      </div>
    </div>
  );
}
