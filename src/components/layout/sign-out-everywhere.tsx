import { ShieldAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { signOutEverywhere } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export async function SignOutEverywhereCard({ body }: { body: string }) {
  const t = await getTranslations("employee");
  const tc = await getTranslations("common");
  return (
    <section className="rounded-2xl border p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <ShieldAlert className="size-4" aria-hidden="true" />
        {t("securityTitle")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      <form action={signOutEverywhere} className="mt-4">
        <Button type="submit" variant="outline" size="touch">
          {tc("signOutEverywhere")}
        </Button>
      </form>
    </section>
  );
}
