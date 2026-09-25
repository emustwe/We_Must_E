"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { createSurvey, createTest, createVideoSet } from "@/actions/admin-panel";
import { btn } from "@/components/admin/wm";
import { WmIcon } from "@/components/map/wm-icons";

const field =
  "h-11 w-full rounded-xl border border-[#D5DAE2] bg-white px-3.5 text-sm text-wm-ink outline-none focus-visible:border-wm-blue";

// The dashed "New ..." button, which opens the form in place.
export function NewContent({ kind }: { kind: "survey" | "test" | "video" }) {
  const t = useTranslations("adminUi");
  const te = useTranslations("errors");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState("10");
  const [pending, startTransition] = useTransition();
  const titleRef = useRef<HTMLInputElement>(null);
  const label = { survey: t("newSurvey"), test: t("newTest"), video: t("newVideoSet") }[kind];
  const placeholder = { survey: t("titleSurvey"), test: t("titleTest"), video: t("titleVideo") }[
    kind
  ];
  const submit = { survey: t("createSurvey"), test: t("createTest"), video: t("createVideoSet") }[
    kind
  ];

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          window.setTimeout(() => titleRef.current?.focus(), 0);
        }}
        className="mt-auto flex h-12 items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-[#C9D1DD] bg-transparent text-sm font-bold text-wm-body hover:bg-wm-mist"
      >
        <WmIcon name="plus" size={17} stroke={2.2} />
        {label}
      </button>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          // On success the server opens the new item's editor.
          const result =
            kind === "survey"
              ? await createSurvey({ title })
              : kind === "test"
                ? await createTest({ title, timeLimitMinutes: minutes })
                : await createVideoSet({ title });
          if (result && !result.ok) toast.error(te(result.error));
        });
      }}
      className="mt-auto flex flex-col gap-3.5 rounded-[18px] border border-wm-line p-4"
    >
      <span className="text-sm font-extrabold">{label}</span>
      <label className="flex min-w-0 flex-col gap-1.5">
        <span className="text-[13px] font-bold">{t("title")}</span>
        <input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={placeholder}
          required
          maxLength={200}
          className={field}
        />
      </label>
      {kind === "test" ? (
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[13px] font-bold">{t("timeLimit")}</span>
          <input
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            inputMode="numeric"
            className={field}
          />
          <span className="text-xs font-medium text-wm-caption">{t("zeroNoLimit")}</span>
        </label>
      ) : null}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className={btn("ghost", "xs")}>
          {t("cancel")}
        </button>
        <button type="submit" disabled={pending} className={btn("primary", "xs")}>
          {submit}
        </button>
      </div>
    </form>
  );
}

// "Preview": the questions as applicants get them, read-only.
export function PreviewButton({ title, questions }: { title: string; questions: string[] }) {
  const t = useTranslations("adminUi");
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className={btn("ghost", "xs")}
      >
        <WmIcon name="eye" size={17} stroke={2.2} />
        {t("preview")}
      </button>
      <dialog
        ref={dialog}
        aria-label={t("previewTitle")}
        className="m-auto w-[min(520px,calc(100vw-32px))] rounded-3xl border-0 bg-white p-0 text-wm-ink shadow-wm-3 backdrop:bg-[rgba(11,18,32,0.4)]"
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      >
        <div className="flex flex-col gap-4 p-6">
          <div>
            <p className="m-0 text-xs font-bold text-wm-caption">{t("previewTitle")}</p>
            <h2 className="m-0 text-xl font-extrabold tracking-[-0.4px]">{title}</h2>
          </div>
          <ol className="m-0 flex max-h-[60dvh] list-none flex-col gap-2 overflow-y-auto p-0">
            {questions.map((q, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-2xl bg-wm-mist px-4 py-3 text-sm font-semibold"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-wm-blue text-xs text-white">
                  {i + 1}
                </span>
                {q}
              </li>
            ))}
          </ol>
          <form method="dialog" className="flex justify-end">
            <button className={btn("secondary", "xs")}>{t("closePreview")}</button>
          </form>
        </div>
      </dialog>
    </>
  );
}
