import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PromptForm } from "@/components/admin/content-forms";
import { Card, PageTitle } from "@/components/admin/ui";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("prompts") };
}

export default async function PromptsPage() {
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const { data: prompts } = await supabase
    .from("video_prompts")
    .select("id, prompt, max_seconds, is_active")
    .order("position");
  return (
    <div className="space-y-5">
      <Link
        href="/admin/content"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        {t("contentTitle")}
      </Link>
      <PageTitle title={t("prompts")} body={t("promptsBody")} />
      <ul className="space-y-3">
        {(prompts ?? []).map((p) => (
          <li key={p.id}>
            <Card>
              <PromptForm
                prompt={{
                  id: p.id,
                  prompt: p.prompt,
                  maxSeconds: p.max_seconds,
                  isActive: p.is_active,
                }}
              />
            </Card>
          </li>
        ))}
      </ul>
      <Card className="border-2 border-dashed shadow-none">
        <PromptForm />
      </Card>
    </div>
  );
}
