import { z } from "zod";
import { idSchema } from "@/lib/validations/jobs";

export const SCOPES = ["profile", "survey", "test", "video", "cv", "contact"] as const;

export const employeeStatusSchema = z.strictObject({
  employeeId: idSchema,
  status: z.enum(["draft", "submitted", "approved", "hidden"]),
});

export const videoStatusSchema = z.strictObject({
  videoId: idSchema,
  status: z.enum(["approved", "rejected"]),
});

export const adminJobStatusSchema = z.strictObject({
  jobId: idSchema,
  status: z.enum(["open", "removed"]),
});

export const grantSchema = z.strictObject({
  employerId: idSchema,
  employeeIds: z.array(idSchema).min(1, { error: "validation.pickEmployees" }).max(100),
  scopes: z.array(z.enum(SCOPES)).min(1, { error: "validation.pickScopes" }),
  expiresAt: z.union([z.literal(""), z.iso.date()]).optional(),
  note: z.string().trim().max(500).optional(),
});
export type GrantInput = z.input<typeof grantSchema>;

const title = z
  .string()
  .trim()
  .min(2, { error: "validation.titleRequired" })
  .max(200, { error: "validation.titleTooLong" });

export const surveySchema = z.strictObject({ title });
export const testSchema = z.strictObject({
  title,
  timeLimitMinutes: z.coerce.number().int().min(1).max(120),
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
    prompt: z.string().trim().min(3, { error: "validation.promptRequired" }).max(1000),
    options: optionList.min(2, { error: "validation.twoOptions" }),
    correctOption: z.number().int().min(0, { error: "validation.pickCorrect" }).max(7),
  })
  .refine((q) => q.correctOption < q.options.length, {
    error: "validation.pickCorrect",
    path: ["correctOption"],
  });

export const promptSchema = z.strictObject({
  id: idSchema.optional(),
  prompt: z.string().trim().min(3, { error: "validation.promptRequired" }).max(500),
  maxSeconds: z.coerce.number().int().min(10).max(300),
  isActive: z.boolean(),
});

export const swapSchema = z.strictObject({
  a: idSchema,
  b: idSchema,
  kind: z.enum(["survey", "test"]),
});
