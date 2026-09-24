"use client";

import { CalendarDays, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { respondToMeeting } from "@/actions/meetings";
import { Badge } from "@/components/admin/ui";
import { SlotLabel, type Slot } from "@/components/meetings/slot-label";
import { Button, buttonVariants } from "@/components/ui/button";

export type Invite = {
  id: string;
  company: string;
  slots: Slot[];
  chosen: number | null;
  link: string | null;
  status: "requested" | "accepted" | "declined" | "cancelled" | "completed";
};

export function MeetingInvite({ invite }: { invite: Invite }) {
  const t = useTranslations("meetings");
  const te = useTranslations("errors");
  const [pending, startTransition] = useTransition();
  const respond = (accept: boolean, slot?: number) =>
    startTransition(async () => {
      const result = await respondToMeeting({ requestId: invite.id, accept, slot });
      if (!result.ok) toast.error(te(result.error));
    });

  return (
    <li className="shadow-float space-y-3 rounded-3xl bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-2 font-bold">
          <CalendarDays className="size-4 text-primary" aria-hidden="true" />
          {invite.company}
        </p>
        <Badge
          tone={
            invite.status === "accepted"
              ? "success"
              : invite.status === "requested"
                ? "warning"
                : "muted"
          }
        >
          {t(`status.${invite.status}`)}
        </Badge>
      </div>
      {invite.status === "requested" ? (
        <>
          <p className="text-sm text-muted-foreground">
            {t("employeeBody", { company: invite.company })}
          </p>
          <ul className="grid gap-2">
            {invite.slots.map((slot, i) => (
              <li key={i}>
                <Button
                  variant="outline"
                  size="touch"
                  className="w-full justify-between"
                  disabled={pending}
                  onClick={() => respond(true, i)}
                >
                  <SlotLabel slot={slot} />
                  <span className="text-xs font-bold text-primary">{t("pick")}</span>
                </Button>
              </li>
            ))}
          </ul>
          <Button
            variant="ghost"
            size="pill"
            className="text-muted-foreground"
            disabled={pending}
            onClick={() => respond(false)}
          >
            {t("decline")}
          </Button>
        </>
      ) : null}
      {invite.status === "accepted" && invite.chosen !== null ? (
        <div className="space-y-2 text-sm">
          <p className="font-semibold">
            {t("chosen")} <SlotLabel slot={invite.slots[invite.chosen]} />
          </p>
          {invite.link ? (
            <a
              href={invite.link}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ size: "pill" })}
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              {t("join")}
            </a>
          ) : (
            <p className="text-muted-foreground">{t("noLinkYet")}</p>
          )}
        </div>
      ) : null}
    </li>
  );
}
