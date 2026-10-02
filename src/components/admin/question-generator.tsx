"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  generateQuestions,
  saveQuestionBuild,
  type GeneratedInterview,
} from "@/actions/question-builder";
import { btn } from "@/components/admin/wm";
import { WmIcon } from "@/components/map/wm-icons";
import type { TestQ } from "@/lib/question-builder/template";

const field = "w-full rounded-xl border border-[#D5DAE2] bg-white px-3.5 text-sm";
const area = `${field} resize-y py-2.5 leading-relaxed`;

// "Generate questions": paste a job, the AI writes it in the WemustE pattern,
// the admin reviews and edits every question, then saves.
export function QuestionGenerator({ aiReady }: { aiReady: boolean }) {
  const t = useTranslations("adminQuestions");
  const te = useTranslations("errors");
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [draft, setDraft] = useState<GeneratedInterview | null>(null);
  const [generating, startGenerate] = useTransition();
  const [saving, startSave] = useTransition();

  const setTest = (i: number, next: Partial<TestQ>) =>
    setDraft((d) => d && { ...d, test: d.test.map((q, j) => (j === i ? { ...q, ...next } : q)) });
  const setVideo = (i: number, prompt: string) =>
    setDraft((d) => d && { ...d, videos: d.videos.map((v, j) => (j === i ? prompt : v)) });

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          startGenerate(async () => {
            const result = await generateQuestions({ title, description });
            if (!result.ok) toast.error(te(result.error));
            else setDraft(result.data);
          });
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold">{t("jobTitle")}</span>
          <input
            className={`${field} h-11`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder={t("jobTitlePlaceholder")}
            required
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold">{t("description")}</span>
          <textarea
            className={area}
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={6000}
            placeholder={t("descriptionPlaceholder")}
            required
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className={btn("primary")}
            disabled={
              generating || !aiReady || title.trim().length < 2 || description.trim().length < 20
            }
          >
            <WmIcon name="checklist" size={17} stroke={2.2} />
            {generating ? t("generating") : t("generate")}
          </button>
          {!aiReady ? (
            <span className="text-[13px] font-semibold text-wm-slate">{t("aiOff")}</span>
          ) : null}
        </div>
      </form>

      {draft ? (
        <section
          className="flex flex-col gap-4 border-t border-wm-line pt-4"
          aria-label={t("reviewTitle")}
        >
          <div className="flex flex-col gap-1">
            <h3 className="m-0 text-base font-extrabold">{t("reviewTitle")}</h3>
            <p className="m-0 text-[13px] font-medium text-wm-slate">{t("reviewBody")}</p>
          </div>

          <h4 className="m-0 text-sm font-extrabold text-wm-blue">{t("section1")}</h4>
          <ol className="m-0 flex list-none flex-col gap-3 p-0">
            {draft.test.map((q, i) => (
              <li key={i} className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-wm-slate">
                  {t("question", { n: i + 1 })}
                </span>
                <textarea
                  aria-label={t("question", { n: i + 1 })}
                  className={area}
                  rows={Math.min(10, q.prompt.split("\n").length + 1)}
                  maxLength={1000}
                  value={q.prompt}
                  onChange={(e) => setTest(i, { prompt: e.target.value })}
                />
                {q.type === "typing" ? (
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-wm-slate">{t("typingText")}</span>
                    <textarea
                      className={area}
                      rows={3}
                      maxLength={600}
                      value={q.options?.[0] ?? ""}
                      onChange={(e) => setTest(i, { options: [e.target.value] })}
                    />
                  </label>
                ) : null}
              </li>
            ))}
          </ol>

          <h4 className="m-0 text-sm font-extrabold text-wm-blue">{t("section2")}</h4>
          <p className="m-0 text-[13px] font-medium text-wm-slate">{t("section2Note")}</p>
          <ol className="m-0 flex list-none flex-col gap-3 p-0">
            {draft.videos.map((v, i) => (
              <li key={i} className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-wm-slate">{t("video", { n: i + 1 })}</span>
                <textarea
                  aria-label={t("video", { n: i + 1 })}
                  className={area}
                  rows={3}
                  maxLength={500}
                  value={v}
                  onChange={(e) => setVideo(i, e.target.value)}
                />
              </li>
            ))}
          </ol>

          <h4 className="m-0 text-sm font-extrabold text-wm-blue">{t("section3")}</h4>
          <p className="m-0 text-[13px] font-medium text-wm-slate">{t("section3Note")}</p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={btn("primary")}
              disabled={saving}
              onClick={() =>
                startSave(async () => {
                  const result = await saveQuestionBuild({
                    title,
                    description,
                    role: draft.role,
                    test: draft.test.map((q) =>
                      q.type === "typing"
                        ? { type: "typing", prompt: q.prompt, options: q.options, time: q.time }
                        : { type: "long_text", prompt: q.prompt },
                    ),
                    videos: draft.videos,
                  });
                  if (!result.ok) {
                    toast.error(te(result.error));
                    return;
                  }
                  toast.success(t("saved"));
                  router.push(`/admin/questions/${result.data.id}`);
                })
              }
            >
              <WmIcon name="check" size={17} stroke={2.4} />
              {t("save")}
            </button>
            <button type="button" className={btn("ghost")} onClick={() => setDraft(null)}>
              {t("discard")}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
