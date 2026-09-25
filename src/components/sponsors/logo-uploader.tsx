"use client";

import { ImagePlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { uploadSponsorLogo } from "@/actions/sponsor-logo";
import { SponsorLogo } from "@/components/sponsors/sponsor-logo";
import { Button } from "@/components/ui/button";
import { LOGO_MAX_BYTES } from "@/lib/sponsors/logo";

export function LogoUploader({
  employerId,
  name,
  path,
}: {
  employerId: string;
  name: string;
  path: string | null;
}) {
  const t = useTranslations("sponsorLogo");
  const te = useTranslations("errors");
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function upload(file: File) {
    if (file.size > LOGO_MAX_BYTES) {
      toast.error(te("fileTooBig"));
      return;
    }
    const data = new FormData();
    data.set("employerId", employerId);
    data.set("logo", file);
    startTransition(async () => {
      const result = await uploadSponsorLogo(data);
      if (!result.ok) toast.error(te(result.error));
      else {
        toast.success(t("saved"));
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center gap-4">
      <SponsorLogo name={name} path={path} className="size-20 text-2xl" />
      <div className="min-w-0 space-y-2">
        <p className="text-sm text-muted-foreground">{t("hint")}</p>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          aria-label={path ? t("change") : t("choose")}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="pill"
          disabled={pending}
          onClick={() => input.current?.click()}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <ImagePlus className="size-4" aria-hidden="true" />
          )}
          {path ? t("change") : t("choose")}
        </Button>
      </div>
    </div>
  );
}
