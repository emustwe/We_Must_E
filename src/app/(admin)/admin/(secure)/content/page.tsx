import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SurveyMetaForm, TestMetaForm } from "@/components/admin/content-forms";
import { Badge, Card, PageTitle } from "@/components/admin/ui";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("contentTitle") };
}

export default async function ContentPage() {
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const [{ data: surveys }, { data: tests }, { count: prompts }] = await Promise.all([
    supabase
      .from("surveys")
      .select("id, title, is_active, survey_questions(count)")
      .order("created_at", { ascending: false }),
    supabase
      .from("tests")
      .select("id, title, is_active, time_limit_seconds, test_questions(count)")
      .order("created_at", { ascending: false }),
    supabase
      .from("video_prompts")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  const Row = ({
    href,
    title,
    live,
    count,
  }: {
    href: string;
    title: string;
    live: boolean;
    count: number;
  }) => (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 rounded-2xl p-3 transition-colors hover:bg-muted/60"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{title}</span>
          <span className="text-xs text-muted-foreground">{t("questionsCount", { count })}</span>
        </span>
        <Badge tone={live ? "success" : "muted"}>{live ? t("live") : t("draft")}</Badge>
        <ChevronRight
          className="size-4 text-muted-foreground rtl:-scale-x-100"
          aria-hidden="true"
        />
      </Link>
    </li>
  );

  return (
    <div>
      <PageTitle title={t("contentTitle")} body={t("contentBody")} />
      <p className="mb-5 rounded-2xl bg-brand-accent/15 px-4 py-3 text-sm font-medium">
        {t("samplesNote")}
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="text-lg font-bold">{t("surveys")}</h2>
          <ul className="-mx-2">
            {(surveys ?? []).map((s) => (
              <Row
                key={s.id}
                href={`/admin/content/surveys/${s.id}`}
                title={s.title}
                live={s.is_active}
                count={s.survey_questions[0]?.count ?? 0}
              />
            ))}
          </ul>
          <SurveyMetaForm />
        </Card>
        <Card className="space-y-4">
          <h2 className="text-lg font-bold">{t("tests")}</h2>
          <ul className="-mx-2">
            {(tests ?? []).map((s) => (
              <Row
                key={s.id}
                href={`/admin/content/tests/${s.id}`}
                title={s.title}
                live={s.is_active}
                count={s.test_questions[0]?.count ?? 0}
              />
            ))}
          </ul>
          <TestMetaForm />
        </Card>
      </div>
      <Card className="mt-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{t("prompts")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("questionsCount", { count: prompts ?? 0 })} · {t("promptsBody")}
          </p>
        </div>
        <Link
          href="/admin/content/prompts"
          className={buttonVariants({ size: "pill", variant: "secondary" })}
        >
          {t("editQuestion")}
        </Link>
      </Card>
    </div>
  );
}
