import { ArrowDown, ArrowLeft, ArrowUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { swapQuestions } from "@/actions/admin-panel";
import { ActionButton } from "@/components/admin/action-button";
import { ActivateButton, PromptForm, VideoSetForm } from "@/components/admin/content-forms";
import { Badge, Card, PageTitle } from "@/components/admin/ui";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validations/jobs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("prompts") };
}

export default async function VideoSetPage({ params }: PageProps<"/admin/content/videos/[id]">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const [{ data: set }, { data: questions }] = await Promise.all([
    supabase.from("video_question_sets").select("id, title, is_active").eq("id", id).maybeSingle(),
    supabase
      .from("video_questions")
      .select("id, prompt, max_seconds, is_active")
      .eq("set_id", id)
      .order("position"),
  ]);
  if (!set) notFound();
  const list = questions ?? [];

  return (
    <div className="space-y-5">
      <Link
        href="/admin/content"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        {t("contentTitle")}
      </Link>
      <PageTitle
        title={set.title}
        body={t("promptsBody")}
        action={
          set.is_active ? (
            <Badge tone="success">{t("live")}</Badge>
          ) : (
            <ActivateButton kind="video" id={set.id} />
          )
        }
      />
      <Card>
        <VideoSetForm set={{ id: set.id, title: set.title }} />
      </Card>
      <ol className="space-y-3">
        {list.map((q, i) => (
          <li key={q.id}>
            <Card className="flex gap-3">
              <div className="flex flex-col gap-1">
                <ActionButton
                  size="icon-sm"
                  variant="ghost"
                  aria-label={t("moveUp")}
                  disabled={i === 0}
                  action={swapQuestions.bind(null, {
                    a: q.id,
                    b: list[i - 1]?.id ?? q.id,
                    kind: "video",
                  })}
                >
                  <ArrowUp className="size-4" />
                </ActionButton>
                <ActionButton
                  size="icon-sm"
                  variant="ghost"
                  aria-label={t("moveDown")}
                  disabled={i === list.length - 1}
                  action={swapQuestions.bind(null, {
                    a: q.id,
                    b: list[i + 1]?.id ?? q.id,
                    kind: "video",
                  })}
                >
                  <ArrowDown className="size-4" />
                </ActionButton>
              </div>
              <div className="flex-1">
                <PromptForm
                  setId={set.id}
                  prompt={{
                    id: q.id,
                    prompt: q.prompt,
                    maxSeconds: q.max_seconds,
                    isActive: q.is_active,
                  }}
                />
              </div>
            </Card>
          </li>
        ))}
      </ol>
      <Card className="border-2 border-dashed shadow-none">
        <PromptForm setId={set.id} />
      </Card>
    </div>
  );
}
