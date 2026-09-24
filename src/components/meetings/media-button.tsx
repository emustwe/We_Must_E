"use client";

import { FileText, Loader2, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { getCandidateMediaUrl } from "@/actions/meetings";
import { Button } from "@/components/ui/button";

// Asks the server for a 5-minute link only when the employer chooses to watch
// or open, so every view is logged and links don't sit in the page.
export function MediaButton({
  employeeId,
  kind,
  id,
  label,
}: {
  employeeId: string;
  kind: "video" | "cv";
  id: string;
  label: string;
}) {
  const te = useTranslations("errors");
  const [url, setUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function load() {
    startTransition(async () => {
      const result = await getCandidateMediaUrl({ employeeId, kind, id });
      if (!result.ok) return void toast.error(te(result.error));
      if (kind === "cv") window.open(result.data.url, "_blank", "noopener,noreferrer");
      else setUrl(result.data.url);
    });
  }

  if (kind === "video" && url) {
    return (
      <video
        src={url}
        controls
        autoPlay
        playsInline
        className="aspect-video w-full rounded-2xl bg-foreground"
      />
    );
  }
  return (
    <Button
      variant={kind === "video" ? "default" : "secondary"}
      size="pill"
      onClick={load}
      disabled={pending}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : kind === "video" ? (
        <Play className="size-4" aria-hidden="true" />
      ) : (
        <FileText className="size-4" aria-hidden="true" />
      )}
      {label}
    </Button>
  );
}
