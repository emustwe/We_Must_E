import { z } from "zod";
import { AVAILABILITY, CITIES } from "@/lib/jobs/meta";
import { idSchema } from "@/lib/validations/jobs";

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9 ()-]{6,19}$/, { error: "validation.phoneInvalid" });
const tag = z.string().trim().min(1).max(40);

export const basicsSchema = z.strictObject({
  headline: z
    .string()
    .trim()
    .min(3, { error: "validation.headlineRequired" })
    .max(120, { error: "validation.headlineTooLong" }),
  cityEmirate: z.enum(CITIES.map((c) => c.id) as [string, ...string[]], {
    error: "validation.cityRequired",
  }),
  languages: z
    .array(tag)
    .min(1, { error: "validation.languagesRequired" })
    .max(10)
    .transform((v) => [...new Set(v)]),
  skills: z
    .array(tag)
    .max(30, { error: "validation.tooManySkills" })
    .transform((v) => [...new Set(v)]),
  availability: z
    .array(z.enum(AVAILABILITY))
    .min(1, { error: "validation.scheduleRequired" })
    .max(5)
    .transform((v) => [...new Set(v)]),
  expectedPayRange: z.string().trim().max(60, { error: "validation.payRangeTooLong" }).optional(),
  phone,
  whatsapp: z.union([z.literal(""), phone]).optional(),
});
export type BasicsInput = z.input<typeof basicsSchema>;

export const surveyAnswerSchema = z.strictObject({
  questionId: idSchema,
  answer: z.union([z.string().max(4000), z.number(), z.array(z.string().max(200)).max(30)]),
});

export const testAnswerSchema = z.strictObject({
  attemptId: idSchema,
  questionId: idSchema,
  option: z.number().int().min(0).max(7),
});

export const registerVideoSchema = z.strictObject({
  promptId: idSchema,
  path: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(webm|mp4)$/),
  durationSeconds: z.number().int().min(1).max(300),
});

export const registerCvSchema = z.strictObject({
  path: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|docx)$/),
});
