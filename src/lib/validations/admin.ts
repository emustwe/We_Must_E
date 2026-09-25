import { z } from "@/lib/validations/zod";
import { idSchema } from "@/lib/validations/jobs";

export const adminJobStatusSchema = z.strictObject({
  jobId: idSchema,
  status: z.enum(["published", "hidden", "closed", "removed"]),
});

export const jobReviewSchema = z.strictObject({
  jobId: idSchema,
  approve: z.boolean(),
  note: z.string().trim().max(500),
});

const title = z
  .string()
  .trim()
  .min(2, { error: "validation.titleRequired" })
  .max(200, { error: "validation.titleTooLong" });

export const surveySchema = z.strictObject({ title });
export const testSchema = z.strictObject({
  title,
  // 0 = no time limit.
  timeLimitMinutes: z.coerce.number().int().min(0).max(120),
});

const optionList = z.array(z.string().trim().min(1).max(200)).max(12);

export const surveyQuestionSchema = z
  .strictObject({
    id: idSchema.optional(),
    surveyId: idSchema,
    type: z.enum(["single_choice", "multi_choice", "short_text", "long_text", "number", "scale"]),
    prompt: z.string().trim().min(3, { error: "validation.promptRequired" }).max(1000),
    options: optionList,
    required: z.boolean(),
  })
  .refine((q) => !["single_choice", "multi_choice"].includes(q.type) || q.options.length >= 2, {
    error: "validation.twoOptions",
    path: ["options"],
  });

// Test questions have no right or wrong answers (nothing is scored).
export const testQuestionSchema = z
  .strictObject({
    id: idSchema.optional(),
    testId: idSchema,
    type: z.enum(["single_choice", "multi_choice", "short_text", "long_text"]),
    prompt: z.string().trim().min(3, { error: "validation.promptRequired" }).max(1000),
    options: optionList,
  })
  .superRefine((q, ctx) => {
    const choice = q.type === "single_choice" || q.type === "multi_choice";
    if (choice && q.options.length < 2) {
      ctx.addIssue({ code: "custom", message: "validation.twoOptions", path: ["options"] });
    }
    if (!choice && q.options.length) {
      ctx.addIssue({ code: "custom", message: "validation.invalid", path: ["options"] });
    }
  });

export const promptSchema = z.strictObject({
  id: idSchema.optional(),
  setId: idSchema,
  prompt: z.string().trim().min(3, { error: "validation.promptRequired" }).max(500),
  maxSeconds: z.coerce.number().int().min(10).max(300),
  isActive: z.boolean(),
});

export const swapSchema = z.strictObject({
  a: idSchema,
  b: idSchema,
  kind: z.enum(["survey", "test", "video"]),
});

export const reviewSchema = z.strictObject({
  applicationId: idSchema,
  decision: z.enum(["approved", "rejected"]),
  notes: z.string().trim().max(2000, { error: "validation.notesTooLong" }),
});

export const videoViewSchema = z.strictObject({ videoId: idSchema });

export const videoSetSchema = z.strictObject({ title });
