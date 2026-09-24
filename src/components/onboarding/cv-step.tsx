"use client";

import { FileText, Loader2, Lock, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { deleteCv, registerCv } from "@/actions/onboarding";
import { FormAlert } from "@/components/forms/form-alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { CV_MAX_BYTES } from "@/lib/onboarding/constants";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const TYPES: Record<string, "pdf" | "docx"> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

export function CvStep({
  userId,
  cv,
  nextHref,
}: {
  userId: string;
  cv: { sizeKb: number; type: string } | null;
  nextHref: string;
}) {
  const t = useTranslations("onboarding.cv");
  const to = useTranslations("onboarding");
  const te = useTranslations("errors");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    const ext =
      TYPES[file.type] ??
      (file.name.toLowerCase().endsWith(".docx")
        ? "docx"
        : file.name.toLowerCase().endsWith(".pdf")
          ? "pdf"
          : null);
    if (!ext) return setError(te("fileType"));
    if (file.size > CV_MAX_BYTES) return setError(te("fileTooBig"));
    startTransition(async () => {
      // Random file name: the original name never leaves the device.
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const contentType =
        ext === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      const { error: uploadError } = await createClient()
        .storage.from("cv-documents")
        .upload(path, file, { contentType, upsert: false });
      if (uploadError) return setError(te("uploadFailed"));
      const result = await registerCv({ path });
      if (!result.ok) return setError(te(result.error));
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <FormAlert message={error} />
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="sr-only"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
        aria-label={t("choose")}
      />
      {cv ? (
        <div className="shadow-float flex items-center gap-3 rounded-3xl bg-card p-4">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FileText className="size-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">{t("uploaded")}</p>
            <p className="text-sm text-muted-foreground">
              {cv.type.toUpperCase()} · {cv.sizeKb} KB
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-touch"
            aria-label={t("remove")}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await deleteCv();
                router.refresh();
              })
            }
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        className="flex w-full flex-col items-center gap-2 rounded-3xl border-2 border-dashed p-8 text-center transition-colors hover:bg-muted/50"
      >
        {pending ? (
          <Loader2 className="size-7 animate-spin text-muted-foreground" aria-hidden="true" />
        ) : (
          <Upload className="size-7 text-muted-foreground" aria-hidden="true" />
        )}
        <span className="font-bold">
          {pending ? t("uploading") : cv ? t("replace") : t("choose")}
        </span>
        <span className="text-sm text-muted-foreground">PDF · DOCX · 5 MB</span>
      </button>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="size-3.5 shrink-0" aria-hidden="true" />
        {t("note")}
      </p>
      <Link
        href={nextHref}
        className={cn(
          buttonVariants({ size: "touch", variant: cv ? "default" : "secondary" }),
          "w-full",
        )}
      >
        {cv ? to("continue") : to("skip")}
      </Link>
    </div>
  );
}
