"use client";

import { CalendarPlus, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { requestMeeting } from "@/actions/meetings";
import { FormAlert } from "@/components/forms/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DURATIONS = [15, 30, 45, 60];

export function MeetingRequestForm({ employeeId }: { employeeId: string }) {
  const t = useTranslations("meetings");
  const te = useTranslations("errors");
  const tAll = useTranslations();
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState([{ start: "", minutes: 30 }]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    // datetime-local is the viewer's local time; send absolute ISO timestamps.
    const payload = slots
      .filter((s) => s.start)
      .map((s) => {
        const start = new Date(s.start);
        return {
          start: start.toISOString(),
          end: new Date(start.getTime() + s.minutes * 60_000).toISOString(),
        };
      });
    startTransition(async () => {
      const result = await requestMeeting({ employeeId, slots: payload });
      if (!result.ok) {
        const key = Object.values(result.fieldErrors ?? {})[0];
        return setError(key && tAll.has(key as never) ? tAll(key as never) : te(result.error));
      }
      toast.success(t("sent"));
      setOpen(false);
      setSlots([{ start: "", minutes: 30 }]);
    });
  }

  if (!open) {
    return (
      <Button size="touch" onClick={() => setOpen(true)}>
        <CalendarPlus className="size-4" aria-hidden="true" />
        {t("request")}
      </Button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="animate-in-fast space-y-4 rounded-3xl border-2 border-foreground bg-card p-5"
    >
      <div>
        <h3 className="text-lg font-bold">{t("requestTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("requestBody")}</p>
      </div>
      <FormAlert message={error} />
      {slots.map((slot, i) => (
        <fieldset key={i} className="grid grid-cols-[1fr_7rem_auto] items-end gap-2">
          <legend className="sr-only">{t("slot", { n: i + 1 })}</legend>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">
              {t("slot", { n: i + 1 })}
            </span>
            <Input
              type="datetime-local"
              value={slot.start}
              dir="ltr"
              required={i === 0}
              onChange={(e) =>
                setSlots(slots.map((s, si) => (si === i ? { ...s, start: e.target.value } : s)))
              }
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">{t("duration")}</span>
            <select
              value={slot.minutes}
              className="h-12 w-full rounded-xl border border-input bg-background px-3"
              onChange={(e) =>
                setSlots(
                  slots.map((s, si) => (si === i ? { ...s, minutes: Number(e.target.value) } : s)),
                )
              }
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {t("minutes", { count: d })}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="ghost"
            size="icon-touch"
            aria-label={t("remove")}
            disabled={slots.length === 1}
            onClick={() => setSlots(slots.filter((_, si) => si !== i))}
          >
            <X className="size-4" />
          </Button>
        </fieldset>
      ))}
      {slots.length < 3 ? (
        <Button
          type="button"
          variant="ghost"
          size="pill"
          onClick={() => setSlots([...slots, { start: "", minutes: 30 }])}
        >
          <Plus className="size-4" aria-hidden="true" />
          {t("addSlot")}
        </Button>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" size="touch" disabled={pending}>
          {t("send")}
        </Button>
        <Button type="button" variant="ghost" size="touch" onClick={() => setOpen(false)}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
