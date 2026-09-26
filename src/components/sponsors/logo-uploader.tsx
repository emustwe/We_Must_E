"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { uploadSponsorLogo } from "@/actions/sponsor-logo";
import { SponsorLogo } from "@/components/sponsors/sponsor-logo";
import { btn } from "@/components/admin/wm";
import { WmIcon } from "@/components/map/wm-icons";
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
      <SponsorLogo name={name} path={path} className="size-[72px] rounded-[20px] text-2xl" />
      <div className="flex min-w-0 flex-col gap-2">
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
        <button
          type="button"
          className={btn("secondary", "sm")}
          disabled={pending}
          onClick={() => input.current?.click()}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <WmIcon name="download" size={15} stroke={2.2} />
          )}
          {path ? t("change") : t("choose")}
        </button>
        <span className="text-xs font-medium text-wm-slate">{t("formats")}</span>
      </div>
    </div>
  );
}
