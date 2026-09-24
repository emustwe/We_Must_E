"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  activateSurvey,
  activateTest,
  createSurvey,
  createTest,
  savePrompt,
  updateSurvey,
  updateTest,
} from "@/actions/admin-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/result";

function useRun() {
  const te = useTranslations("errors");
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<ActionResult<unknown>>, success?: string) =>
    startTransition(async () => {
      const result = await fn();
      if (result && !result.ok) toast.error(te(result.error));
      else if (success) toast.success(success);
    });
  return { pending, run };
}

export function SurveyMetaForm({ survey }: { survey?: { id: string; title: string } }) {
  const t = useTranslations("admin");
  const [title, setTitle] = useState(survey?.title ?? "");
  const { pending, run } = useRun();
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () => (survey ? updateSurvey(survey.id, { title }) : createSurvey({ title })),
          survey ? t("saved") : undefined,
        );
      }}
    >
      <label className="block flex-1 space-y-2">
        <span className="text-sm font-medium">{t("title")}</span>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <Button size="touch" disabled={pending}>
        {survey ? t("save") : t("newSurvey")}
      </Button>
    </form>
  );
}

export function TestMetaForm({
  test,
}: {
  test?: { id: string; title: string; minutes: number; passScore: number };
}) {
  const t = useTranslations("admin");
  const [title, setTitle] = useState(test?.title ?? "");
  const [minutes, setMinutes] = useState(String(test?.minutes ?? 10));
  const [pass, setPass] = useState(String(test?.passScore ?? 60));
  const { pending, run } = useRun();
  return (
    <form
      className="grid gap-2 sm:grid-cols-[1fr_9rem_9rem_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        const values = { title, timeLimitMinutes: minutes, passScore: pass };
        run(
          () => (test ? updateTest(test.id, values) : createTest(values)),
          test ? t("saved") : undefined,
        );
      }}
    >
      <label className="block space-y-2">
        <span className="text-sm font-medium">{t("title")}</span>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium">{t("timeLimit")}</span>
        <Input value={minutes} onChange={(e) => setMinutes(e.target.value)} inputMode="numeric" />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium">{t("passScore")}</span>
        <Input value={pass} onChange={(e) => setPass(e.target.value)} inputMode="numeric" />
      </label>
      <Button size="touch" disabled={pending}>
        {test ? t("save") : t("newTest")}
      </Button>
    </form>
  );
}

export function ActivateButton({ kind, id }: { kind: "survey" | "test"; id: string }) {
  const t = useTranslations("admin");
  const { pending, run } = useRun();
  return (
    <Button
      size="pill"
      disabled={pending}
      onClick={() =>
        run(() => (kind === "survey" ? activateSurvey(id) : activateTest(id)), t("madeLive"))
      }
    >
      {t("makeLive")}
    </Button>
  );
}

export function PromptForm({
  prompt,
}: {
  prompt?: { id: string; prompt: string; maxSeconds: number; isActive: boolean };
}) {
  const t = useTranslations("admin");
  const [text, setText] = useState(prompt?.prompt ?? "");
  const [seconds, setSeconds] = useState(String(prompt?.maxSeconds ?? 90));
  const [active, setActive] = useState(prompt?.isActive ?? true);
  const { pending, run } = useRun();
  return (
    <form
      className="grid gap-2 sm:grid-cols-[1fr_8rem_auto_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => {
          const result = await savePrompt({
            id: prompt?.id,
            prompt: text,
            maxSeconds: seconds,
            isActive: active,
          });
          if (result.ok && !prompt) setText("");
          return result;
        }, t("saved"));
      }}
    >
      <label className="block space-y-2">
        <span className="text-sm font-medium">{t("questionPrompt")}</span>
        <Input value={text} onChange={(e) => setText(e.target.value)} required />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium">{t("maxSeconds")}</span>
        <Input value={seconds} onChange={(e) => setSeconds(e.target.value)} inputMode="numeric" />
      </label>
      <label className="flex h-12 items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="size-4"
        />
        {t("active")}
      </label>
      <Button size="touch" disabled={pending}>
        {prompt ? t("save") : t("newPrompt")}
      </Button>
    </form>
  );
}
