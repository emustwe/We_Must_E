"use client";

import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteSurveyQuestion,
  deleteTestQuestion,
  saveSurveyQuestion,
  saveTestQuestion,
  swapQuestions,
} from "@/actions/admin-panel";
import { Badge } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";

type QType = "single_choice" | "multi_choice" | "short_text" | "long_text" | "number" | "scale";
export type EditableQuestion = {
  id: string;
  prompt: string;
  options: string[];
  type?: QType;
  required?: boolean;
};

const TYPES: QType[] = [
  "single_choice",
  "multi_choice",
  "short_text",
  "long_text",
  "number",
  "scale",
];
const TEST_TYPES: QType[] = ["single_choice", "multi_choice", "short_text", "long_text"];
const hasOptions = (type: QType) => type === "single_choice" || type === "multi_choice";

// Shared editor for survey questions (typed) and test questions (options +
// no right or wrong answers).
export function QuestionEditor({
  kind,
  parentId,
  questions,
}: {
  kind: "survey" | "test";
  parentId: string;
  questions: EditableQuestion[];
}) {
  const t = useTranslations("admin");
  const te = useTranslations("errors");
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const ask = useConfirm();
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, onOk?: () => void) =>
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) toast.error(te((result.error ?? "generic") as "generic"));
      else onOk?.();
    });

  return (
    <div className="space-y-3">
      <ol className="space-y-3">
        {questions.map((q, i) =>
          editing === q.id ? (
            <li key={q.id}>
              <QuestionForm
                kind={kind}
                parentId={parentId}
                initial={q}
                onDone={() => setEditing(null)}
              />
            </li>
          ) : (
            <li key={q.id} className="shadow-float rounded-3xl bg-card p-4">
              <div className="flex items-start gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{q.prompt}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {q.type ? <Badge>{t(`types.${q.type}`)}</Badge> : null}
                    {q.required ? <Badge tone="primary">{t("requiredQuestion")}</Badge> : null}
                    {q.options.map((o, oi) => (
                      <Badge key={oi}>{o}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("moveUp")}
                    disabled={i === 0 || pending}
                    onClick={() =>
                      run(() => swapQuestions({ a: q.id, b: questions[i - 1].id, kind }))
                    }
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("moveDown")}
                    disabled={i === questions.length - 1 || pending}
                    onClick={() =>
                      run(() => swapQuestions({ a: q.id, b: questions[i + 1].id, kind }))
                    }
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("editQuestion")}
                    onClick={() => setEditing(q.id)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("deleteQuestion")}
                    className="text-destructive"
                    disabled={pending}
                    onClick={async () => {
                      if (
                        !(await ask({
                          title: t("deleteConfirm"),
                          tone: "danger",
                          confirmLabel: t("deleteQuestion"),
                        }))
                      )
                        return;
                      run(() =>
                        kind === "survey" ? deleteSurveyQuestion(q.id) : deleteTestQuestion(q.id),
                      );
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </li>
          ),
        )}
      </ol>
      {editing === "new" ? (
        <QuestionForm kind={kind} parentId={parentId} onDone={() => setEditing(null)} />
      ) : (
        <Button
          size="touch"
          variant="secondary"
          onClick={() => setEditing("new")}
          className="w-full"
        >
          <Plus className="size-4" aria-hidden="true" />
          {t("addQuestion")}
        </Button>
      )}
    </div>
  );
}

function QuestionForm({
  kind,
  parentId,
  initial,
  onDone,
}: {
  kind: "survey" | "test";
  parentId: string;
  initial?: EditableQuestion;
  onDone: () => void;
}) {
  const t = useTranslations("admin");
  const te = useTranslations("errors");
  const tAll = useTranslations();
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [type, setType] = useState<QType>(initial?.type ?? "single_choice");
  const [required, setRequired] = useState(initial?.required ?? true);
  const [options, setOptions] = useState<string[]>(
    initial?.options.length ? initial.options : ["", ""],
  );

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const showOptions = hasOptions(type);

  function save() {
    setError(null);
    const cleaned = showOptions ? options.map((o) => o.trim()).filter(Boolean) : [];
    startTransition(async () => {
      const result =
        kind === "survey"
          ? await saveSurveyQuestion({
              id: initial?.id,
              surveyId: parentId,
              type,
              prompt,
              options: cleaned,
              required,
            })
          : await saveTestQuestion({
              id: initial?.id,
              testId: parentId,
              type,
              prompt,
              options: cleaned,
            });
      if (!result.ok) {
        const key = Object.values(result.fieldErrors ?? {})[0];
        return setError(key && tAll.has(key as never) ? tAll(key as never) : te(result.error));
      }
      onDone();
    });
  }

  return (
    <div className="animate-in-fast space-y-4 rounded-3xl border-2 border-foreground bg-card p-4">
      <label className="block space-y-2">
        <span className="text-sm font-medium">{t("questionPrompt")}</span>
        <textarea
          aria-label={t("questionPrompt")}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-input bg-background px-4 py-3"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="font-medium">{t("questionType")}</span>
          <select
            aria-label={t("questionType")}
            value={type}
            onChange={(e) => {
              setType(e.target.value as QType);
            }}
            className="h-10 rounded-xl border border-input bg-background px-3"
          >
            {(kind === "test" ? TEST_TYPES : TYPES).map((ty) => (
              <option key={ty} value={ty}>
                {t(`types.${ty}`)}
              </option>
            ))}
          </select>
        </label>
        {kind === "survey" ? (
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="size-4"
            />
            {t("requiredQuestion")}
          </label>
        ) : null}
      </div>
      {kind === "test" ? (
        <p className="text-sm text-muted-foreground">{t("noRightAnswers")}</p>
      ) : null}
      {showOptions ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t("options")}</legend>
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={o}
                onChange={(e) =>
                  setOptions(options.map((x, xi) => (xi === i ? e.target.value : x)))
                }
                placeholder={t("optionPlaceholder", { n: i + 1 })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("deleteQuestion")}
                disabled={options.length <= 2}
                onClick={() => {
                  setOptions(options.filter((_, xi) => xi !== i));
                }}
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
          {options.length < 8 ? (
            <Button
              type="button"
              variant="ghost"
              size="pill"
              onClick={() => setOptions([...options, ""])}
            >
              <Plus className="size-4" aria-hidden="true" />
              {t("addOption")}
            </Button>
          ) : null}
        </fieldset>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button size="pill" onClick={save} disabled={pending}>
          {t("save")}
        </Button>
        <Button size="pill" variant="ghost" onClick={onDone}>
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}
