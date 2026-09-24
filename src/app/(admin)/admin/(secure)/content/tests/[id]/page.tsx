import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ActivateButton, TestMetaForm } from "@/components/admin/content-forms";
import { QuestionEditor } from "@/components/admin/question-editor";
import { Badge, Card } from "@/components/admin/ui";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validations/jobs";

export default async function TestEditorPage({ params }: PageProps<"/admin/content/tests/[id]">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const [{ data: test }, { data: questions }, { data: keys }] = await Promise.all([
    supabase
      .from("tests")
      .select("id, title, is_active, time_limit_seconds, pass_score")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("test_questions")
      .select("id, type, points, prompt, options")
      .eq("test_id", id)
      .order("position"),
    // Answer keys are only readable through this admin-only RPC.
    supabase.rpc("admin_get_answer_keys", { p_test_id: id }),
  ]);
  if (!test) notFound();
  const keyFor = new Map((keys ?? []).map((k) => [k.question_id, k.correct_options]));
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
        <h1 className="text-3xl font-extrabold tracking-tight">{test.title}</h1>
        <Badge tone={test.is_active ? "success" : "muted"}>
          {test.is_active ? t("live") : t("draft")}
        </Badge>
        {!test.is_active ? <ActivateButton kind="test" id={test.id} /> : null}
      </div>
      <Card>
        <TestMetaForm
          test={{
            id: test.id,
            title: test.title,
            minutes: Math.round((test.time_limit_seconds ?? 0) / 60),
            passScore: Number(test.pass_score),
          }}
        />
      </Card>
      <QuestionEditor
        kind="test"
        parentId={test.id}
        questions={(questions ?? []).map((q) => ({
          id: q.id,
          prompt: q.prompt,
          options: Array.isArray(q.options) ? q.options.map(String) : [],
          type: q.type,
          points: q.points,
          correctOptions: keyFor.get(q.id) ?? [],
        }))}
      />
    </div>
  );
}
