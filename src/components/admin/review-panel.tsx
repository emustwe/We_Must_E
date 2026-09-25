"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { getVideoUrl, reviewApplication } from "@/actions/admin-applications";
import { btn } from "@/components/admin/wm";
import { WmIcon } from "@/components/map/wm-icons";
import { useConfirm } from "@/components/ui/confirm-dialog";

// "…" in the panel header: contact details, notes and earlier applications.
export function MoreToggle({ children }: { children: ReactNode }) {
  const t = useTranslations("adminUi");
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={t("moreActions")}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-wm-field bg-white text-wm-body hover:bg-wm-mist"
      >
        <WmIcon name="more" size={18} stroke={2.6} />
      </button>
      {open ? <div className="basis-full">{children}</div> : null}
    </>
  );
}

// One playable thumbnail; the 5-minute link is fetched (and the view logged)
// only when it is played.
export function VideoTile({
  videoId,
  length,
  caption,
}: {
  videoId: string;
  length: string;
  caption: string;
}) {
  const t = useTranslations("adminUi");
  const te = useTranslations("errors");
  const [url, setUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (url) {
    return (
      <video
        src={url}
        controls
        autoPlay
        playsInline
        className="aspect-video w-full rounded-[14px] bg-black"
      />
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await getVideoUrl({ videoId });
            if (!result.ok) toast.error(te(result.error));
            else setUrl(result.data.url);
          })
        }
        aria-label={`${t("playVideo")} (${t("viewLogged")})`}
        className="relative flex h-[84px] w-full items-center justify-center rounded-[14px] border-0 bg-[#1E2638] sm:w-[152px]"
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-white/[0.92] text-wm-ink">
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <WmIcon name="play" size={15} stroke={2} fill="currentColor" />
          )}
        </span>
        <span className="absolute right-2 bottom-1.5 text-[11px] font-bold text-white">
          {length}
        </span>
      </button>
      <span className="text-xs font-bold text-wm-body">{caption}</span>
    </div>
  );
}

export function ShowAll({ children, count }: { children: ReactNode; count: number }) {
  const t = useTranslations("adminUi");
  const [open, setOpen] = useState(false);
  if (!count) return null;
  return (
    <>
      {open ? children : null}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="h-10 rounded-xl border border-wm-field bg-white text-[13px] font-bold text-wm-ink hover:bg-wm-mist"
      >
        {open ? t("hideAll") : t("showAll")}
      </button>
    </>
  );
}

// Reject / Approve side by side, with the optional note for the team.
export function DecisionBar({
  applicationId,
  status,
  notes,
}: {
  applicationId: string;
  status: "submitted" | "approved" | "rejected";
  notes: string;
}) {
  const t = useTranslations("adminUi");
  const ta = useTranslations("admin");
  const te = useTranslations("errors");
  const ask = useConfirm();
  const router = useRouter();
  const [text, setText] = useState(notes);
  const [pending, startTransition] = useTransition();

  async function decide(decision: "approved" | "rejected") {
    const approve = decision === "approved";
    const yes = await ask({
      title: approve ? ta("approve") : ta("reject"),
      body: approve ? ta("approveConfirm") : ta("rejectConfirm"),
      confirmLabel: approve ? ta("approve") : ta("reject"),
      tone: approve ? "default" : "danger",
    });
    if (!yes) return;
    startTransition(async () => {
      const result = await reviewApplication({ applicationId, decision, notes: text });
      if (!result.ok) toast.error(te(result.error));
      else {
        toast.success(approve ? ta("approvedToast") : ta("rejectedToast"));
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-auto flex flex-col gap-2.5 border-t border-[#EEF0F4] pt-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold">{t("notes")}</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder={t("notesPlaceholder")}
          className="rounded-xl border border-[#D5DAE2] bg-white px-3.5 py-2.5 text-sm"
        />
      </label>
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          disabled={pending || status === "rejected"}
          onClick={() => decide("rejected")}
          className={btn("danger")}
        >
          <WmIcon name="close" size={17} stroke={2.2} />
          {t("reject")}
        </button>
        <button
          type="button"
          disabled={pending || status === "approved"}
          onClick={() => decide("approved")}
          className={btn("primary")}
        >
          <WmIcon name="check" size={17} stroke={2.2} />
          {t("approve")}
        </button>
      </div>
      <span className="flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-wm-body">
        <WmIcon name="lock" size={14} stroke={2.2} />
        {t("sponsorsOnly")}
      </span>
    </div>
  );
}
