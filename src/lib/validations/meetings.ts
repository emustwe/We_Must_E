import { z } from "zod";
import { idSchema } from "@/lib/validations/jobs";

const slot = z
  .strictObject({ start: z.iso.datetime({ offset: true }), end: z.iso.datetime({ offset: true }) })
  .refine((s) => new Date(s.end) > new Date(s.start), { error: "validation.slotOrder" });

export const meetingRequestSchema = z
  .strictObject({
    employeeId: idSchema,
    slots: z
      .array(slot)
      .min(1, { error: "validation.slotRequired" })
      .max(3, { error: "validation.slotMax" }),
  })
  .refine((m) => m.slots.every((s) => new Date(s.start).getTime() > Date.now() + 30 * 60_000), {
    error: "validation.slotFuture",
    path: ["slots"],
  });

export const meetingResponseSchema = z.strictObject({
  requestId: idSchema,
  accept: z.boolean(),
  slot: z.number().int().min(0).max(2).optional(),
});

export const meetingUpdateSchema = z.strictObject({
  requestId: idSchema,
  status: z.enum(["cancelled", "completed"]).optional(),
  meetingLink: z
    .url({ protocol: /^https$/, error: "validation.meetingLink" })
    .max(500)
    .optional(),
});

export const mediaRequestSchema = z.strictObject({
  employeeId: idSchema,
  kind: z.enum(["video", "cv"]),
  id: idSchema,
});
