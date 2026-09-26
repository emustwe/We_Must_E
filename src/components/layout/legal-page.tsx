import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";

export async function LegalPage({
  title,
  version,
  sections,
  draft = true,
}: {
  title: string;
  version: string;
  sections: { heading: string; body: string }[];
  // Still a placeholder for the client's lawyer: shows the warning box.
  draft?: boolean;
}) {
  const t = await getTranslations("legal");
  const tb = await getTranslations("brand");
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <Link href="/" aria-label={tb("home")} className="inline-block rounded-lg">
        <Logo />
      </Link>
      {draft ? (
        <div
          role="note"
          className="mt-8 flex items-start gap-2 rounded-xl border-2 border-dashed border-brand-accent bg-brand-accent/10 p-4 text-sm font-semibold"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t("placeholder")}
        </div>
      ) : null}
      <h1 className="mt-8 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("updated", { version })}</p>
      <div className="mt-8 space-y-6">
        {sections.map((section) => (
          <section key={section.heading} className="space-y-2">
            <h2 className="text-lg font-semibold">{section.heading}</h2>
            <p className="leading-relaxed whitespace-pre-line text-muted-foreground">
              {section.body}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}
