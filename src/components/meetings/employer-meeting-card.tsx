"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateMeeting } from "@/actions/meetings";
import { Badge } from "@/components/admin/ui";
import { SlotLabel, type Slot } from "@/components/meetings/slot-label";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type EmployerMeeting = {
  id: string;
  status: "requested" | "accepted" | "declined" | "cancelled" | "completed";
  slots: Slot[];
  chosen: number | null;
  link: string | null;
  employeeId: string;
  who: string;
};

const TONE = {
  requested: "warning",
  accepted: "success",
  declined: "muted",
  cancelled: "muted",
  completed: "primary",
} as const;

export function EmployerMeetingCard({ meeting }: { meeting: EmployerMeeting }) {
  const t = useTranslations("meetings");
  const te = useTranslations("errors");
  const tAll = useTranslations();
  const [link, setLink] = useState(meeting.link ?? "");
  const [pending, startTransition] = useTransition();
  const chosen = meeting.chosen !== null ? meeting.slots[meeting.chosen] : null;

  const run = (
    input: { status?: "cancelled" | "completed"; meetingLink?: string },
    success?: string,
  ) =>
    startTransition(async () => {
      const result = await updateMeeting({ requestId: meeting.id, ...input });
      if (!result.ok) {
        const key = Object.values(result.fieldErrors ?? {})[0];
        return void toast.error(
          key && tAll.has(key as never) ? tAll(key as never) : te(result.error),
        );
      }
      if (success) toast.success(success);
    });

  return (
    <li className="shadow-float space-y-3 rounded-3xl bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/employer/candidates/${meeting.employeeId}`}
          className="font-bold hover:underline"
        >
          {meeting.who}
        </Link>
        <Badge tone={TONE[meeting.status]}>{t(`status.${meeting.status}`)}</Badge>
      </div>
      {chosen ? (
        <p className="text-sm font-semibold">
          {t("chosen")} <SlotLabel slot={chosen} />
        </p>
      ) : (
        <div className="text-sm">
          <p className="text-xs font-semibold text-muted-foreground">{t("proposed")}</p>
          <ul className="mt-1 space-y-0.5">
            {meeting.slots.map((s, i) => (
              <li key={i}>
                <SlotLabel slot={s} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {meeting.status === "accepted" ? (
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            run({ meetingLink: link.trim() }, t("linkSaved"));
          }}
        >
          <Input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder={t("linkPlaceholder")}
            aria-label={t("link")}
            dir="ltr"
            type="url"
          />
          <Button size="touch" variant="secondary" disabled={pending || !link.trim()}>
            {t("saveLink")}
          </Button>
        </form>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {meeting.status === "accepted" && meeting.link ? (
          <a
            href={meeting.link}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ size: "pill" })}
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            {t("join")}
          </a>
        ) : null}
        {meeting.status === "accepted" ? (
          <Button
            size="pill"
            variant="secondary"
            disabled={pending}
            onClick={() => run({ status: "completed" })}
          >
            {t("markDone")}
          </Button>
        ) : null}
        {meeting.status === "requested" || meeting.status === "accepted" ? (
          <Button
            size="pill"
            variant="ghost"
            className="text-destructive"
            disabled={pending}
            onClick={() => window.confirm(t("cancelConfirm")) && run({ status: "cancelled" })}
          >
            {t("cancelMeeting")}
          </Button>
        ) : null}
      </div>
    </li>
  );
}
