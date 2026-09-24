import { toE164 } from "@/lib/phone";
import { emailSchema } from "@/lib/validations/auth";
import { z } from "@/lib/validations/zod";

export const jobIdSchema = z.guid();

export const startSchema = z.strictObject({
  jobId: z.guid(),
  captchaToken: z.string().max(2048).optional(),
});

// {"options":[1]} for choice questions, {"text":"..."} for written ones.
// The database checks the answer against the question type.
export const testAnswerSchema = z.strictObject({
  jobId: z.guid(),
  questionId: z.guid(),
  answer: z.union([
    z.strictObject({ options: z.array(z.int().min(0).max(7)).min(1).max(8) }),
    z.strictObject({ text: z.string().max(3000) }),
  ]),
});

export const videoUploadSchema = z.strictObject({
  jobId: z.guid(),
  questionId: z.guid(),
  mime: z.enum(["video/webm", "video/mp4"]),
});

export const videoConfirmSchema = z.strictObject({
  jobId: z.guid(),
  questionId: z.guid(),
  path: z.string().max(300),
  durationSeconds: z.number().min(0).max(320),
});

export const phoneSchema = z
  .string()
  .trim()
  .max(30)
  .transform((value, ctx) => {
    const e164 = toE164(value);
    if (!e164) {
      ctx.addIssue({ code: "custom", message: "validation.phoneInvalid" });
      return z.NEVER;
    }
    return e164;
  });

export const contactSchema = z.strictObject({
  fullName: z
    .string()
    .trim()
    .min(2, { error: "validation.nameRequired" })
    .max(120, { error: "validation.nameTooLong" }),
  phone: phoneSchema,
  email: z.union([emailSchema, z.literal("")]),
});
export type ContactInput = z.input<typeof contactSchema>;

const surveyAnswer = z.union([
  z.strictObject({ options: z.array(z.int().min(0).max(7)).min(1).max(8) }),
  z.strictObject({ text: z.string().trim().min(1).max(3000) }),
  z.strictObject({ number: z.number().finite().min(-1e9).max(1e9) }),
]);

export const submitSchema = z.strictObject({
  jobId: z.guid(),
  contact: contactSchema,
  answers: z.record(z.guid(), surveyAnswer),
  consent: z.literal(true, { error: "validation.acceptConsent" }),
});

export const phoneCodeSchema = z.strictObject({ jobId: z.guid(), phone: phoneSchema });
export const verifyCodeSchema = z.strictObject({
  jobId: z.guid(),
  code: z.string().regex(/^\d{6}$/, { error: "validation.emailCode" }),
});
