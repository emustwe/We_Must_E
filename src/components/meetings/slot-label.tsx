"use client";

import { useFormatter } from "next-intl";

export type Slot = { start: string; end: string };

export function SlotLabel({ slot }: { slot: Slot }) {
  const format = useFormatter();
  const start = new Date(slot.start);
  const end = new Date(slot.end);
  return (
    <span>
      {format.dateTime(start, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })}
      {" – "}
      {format.dateTime(end, { hour: "numeric", minute: "2-digit" })}
    </span>
  );
}
