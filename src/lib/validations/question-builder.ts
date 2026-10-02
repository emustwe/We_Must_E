import { TYPING_MAX } from "@/lib/question-builder/fields";
import { z } from "@/lib/validations/zod";

// The job an admin pastes into the Question builder.
export const generateQuestionsSchema = z.strictObject({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(20).max(6000),
});

// The (possibly edited) questions an admin saves: 25 test questions and 7
// video questions, in the fixed pattern.
export const saveQuestionBuildSchema = z.strictObject({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(1).max(6000),
  role: z.record(z.string(), z.string().max(2000)),
  test: z
    .array(
      z.union([
        z.strictObject({
          type: z.literal("long_text"),
          prompt: z.string().trim().min(1).max(1000),
        }),
        z.strictObject({
          type: z.literal("typing"),
          prompt: z.string().trim().min(1).max(1000),
          options: z.tuple([z.string().trim().min(10).max(TYPING_MAX)]),
          time: z.number().int().min(10).max(600),
        }),
      ]),
    )
    .length(25),
  videos: z.array(z.string().trim().min(1).max(500)).length(7),
});

export const attachQuestionBuildSchema = z.strictObject({
  buildId: z.guid(),
  jobId: z.guid(),
});
