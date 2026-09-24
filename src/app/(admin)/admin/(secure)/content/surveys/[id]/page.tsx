import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ActivateButton, SurveyMetaForm } from "@/components/admin/content-forms";
import { QuestionEditor } from "@/components/admin/question-editor";
import { Badge, Card } from "@/components/admin/ui";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validations/jobs";

export default async function SurveyEditorPage({
  params,
}: PageProps<"/admin/content/surveys/[id]">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const [{ data: survey }, { data: questions }] = await Promise.all([
    supabase.from("surveys").select("id, title, is_active").eq("id", id).maybeSingle(),
    supabase
      .from("survey_questions")
      .select("id, type, prompt, options, required")
      .eq("survey_id", id)
      .order("position"),
  ]);
  if (!survey) notFound();
  return (
    <div className="space-y-5">
      <Link
        href="/admin/content"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        {t("contentTitle")}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">{survey.title}</h1>
        <Badge tone={survey.is_active ? "success" : "muted"}>
          {survey.is_active ? t("live") : t("draft")}
        </Badge>
        {!survey.is_active ? <ActivateButton kind="survey" id={survey.id} /> : null}
      </div>
      <Card>
        <SurveyMetaForm survey={{ id: survey.id, title: survey.title }} />
      </Card>
      <QuestionEditor
        kind="survey"
        parentId={survey.id}
        questions={(questions ?? []).map((q) => ({
          id: q.id,
          prompt: q.prompt,
          type: q.type,
          required: q.required,
          options: Array.isArray(q.options) ? q.options.map(String) : [],
        }))}
      />
    </div>
  );
}
