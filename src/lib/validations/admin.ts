import { z } from "@/lib/validations/zod";
import { idSchema } from "@/lib/validations/jobs";

export const adminJobStatusSchema = z.strictObject({
  jobId: idSchema,
  status: z.enum(["published", "hidden", "closed", "removed"]),
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
  passScore: z.coerce.number().min(0).max(100),
});

const optionList = z.array(z.string().trim().min(1).max(200)).max(8);

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

export const testQuestionSchema = z
  .strictObject({
    id: idSchema.optional(),
    testId: idSchema,
    type: z.enum(["single_choice", "multi_choice", "short_text", "long_text"]),
    prompt: z.string().trim().min(3, { error: "validation.promptRequired" }).max(1000),
    points: z.coerce.number().int().min(0).max(100),
    options: optionList,
    correctOptions: z.array(z.int().min(0).max(7)).max(8),
  })
  .superRefine((q, ctx) => {
    const choice = q.type === "single_choice" || q.type === "multi_choice";
    if (!choice) {
      if (q.options.length || q.correctOptions.length) {
        ctx.addIssue({ code: "custom", message: "validation.invalid", path: ["options"] });
      }
      return;
    }
    if (q.options.length < 2) {
      ctx.addIssue({ code: "custom", message: "validation.twoOptions", path: ["options"] });
    }
    const valid =
      q.correctOptions.length > 0 && q.correctOptions.every((o) => o < q.options.length);
    if (!valid || (q.type === "single_choice" && q.correctOptions.length !== 1)) {
      ctx.addIssue({ code: "custom", message: "validation.pickCorrect", path: ["correctOptions"] });
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

export const gradeSchema = z.strictObject({
  applicationId: idSchema,
  questionId: idSchema,
  points: z.coerce.number().min(0).max(100),
});

export const videoViewSchema = z.strictObject({ applicationId: idSchema, questionId: idSchema });

export const videoSetSchema = z.strictObject({ title });
