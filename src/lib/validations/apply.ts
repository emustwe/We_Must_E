import { toE164 } from "@/lib/phone";
import { emailSchema } from "@/lib/validations/auth";
import { z } from "@/lib/validations/zod";

export const jobIdSchema = z.guid();

export const startSchema = z.strictObject({
  jobId: z.guid(),
  captchaToken: z.string().max(2048).optional(),
});

// The typing question: what was typed, and how (the page counts keystrokes).
const typingAnswer = z.strictObject({
  text: z.string().max(3000),
  stats: z.strictObject({
    seconds: z.number().min(0).max(100000),
    backspaces: z.int().min(0).max(100000),
    keystrokes: z.int().min(0).max(100000),
  }),
});

// {"options":[1]} for choice questions, {"text":"..."} for written ones.
// The database checks the answer against the question type.
export const testAnswerSchema = z.strictObject({
  jobId: z.guid(),
  questionId: z.guid(),
  answer: z.union([
    z.strictObject({ options: z.array(z.int().min(0).max(11)).min(1).max(12) }),
    z.strictObject({ text: z.string().max(3000) }),
    typingAnswer,
  ]),
});

// All test answers at once (the test is one page).
export const testAnswersSchema = z.strictObject({
  jobId: z.guid(),
  answers: z
    .array(
      z.strictObject({
        questionId: z.guid(),
        answer: z.union([
          z.strictObject({ options: z.array(z.int().min(0).max(11)).min(1).max(12) }),
          z.strictObject({ text: z.string().max(3000) }),
          typingAnswer,
        ]),
      }),
    )
    .max(100),
});

export const videoUploadSchema = z.strictObject({
  jobId: z.guid(),
  // The video question it answers (none: the one video about the test).
  questionId: z.guid().optional(),
  mime: z.enum(["video/webm", "video/mp4", "video/quicktime"]),
});

export const videoConfirmSchema = z.strictObject({
  jobId: z.guid(),
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
  z.strictObject({ options: z.array(z.int().min(0).max(11)).min(1).max(12) }),
  // "Other" with what the applicant typed.
  z.strictObject({
    options: z.array(z.int().min(0).max(11)).min(1).max(12),
    other: z.string().trim().min(1).max(300),
  }),
  z.strictObject({ text: z.string().trim().min(1).max(3000) }),
  z.strictObject({ number: z.number().finite().min(-1e9).max(1e9) }),
]);

export const submitSchema = z.strictObject({
  jobId: z.guid(),
  answers: z
    .record(z.guid(), surveyAnswer)
    .refine((r) => Object.keys(r).length <= 200, { message: "validation.invalid" }),
  consent: z.literal(true, { error: "validation.acceptConsent" }),
});

export const phoneCodeSchema = z.strictObject({ jobId: z.guid(), phone: phoneSchema });
export const verifyCodeSchema = z.strictObject({
  jobId: z.guid(),
  code: z.string().regex(/^\d{6}$/, { error: "validation.emailCode" }),
});

// ------------------------------------------------------------------ Task profile
// The Task step's profile. Practice jobs ask only for name, phone and email;
// a job with a full profile asks for every field below (all required).
export const GENDERS = ["male", "female", "prefer_not"] as const;
export const ENGLISH_LEVELS = ["beginner", "intermediate", "advanced", "fluent", "native"] as const;

const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1, { error: "validation.required" })
    .max(max, { error: "validation.tooLong" });

// Every applicant confirms they are an adult (UAE: workers under 18 need
// special permits).
const adultSchema = z.literal("yes", { error: "validation.adultRequired" });

export const basicProfileSchema = z.strictObject({
  fullName: contactSchema.shape.fullName,
  phone: phoneSchema,
  email: z.union([emailSchema, z.literal("")]),
  adult: adultSchema,
});

export const fullProfileSchema = z.strictObject({
  fullName: contactSchema.shape.fullName,
  preferredName: text(60),
  // Age and gender are optional: hiring must not depend on them (UAE Labour
  // Law, Article 4). If given, the age must be 18 or over.
  age: z.union([
    z.literal(""),
    z.coerce
      .number({ error: "validation.invalid" })
      .int({ error: "validation.invalid" })
      .min(18, { error: "validation.ageRange" })
      .max(80, { error: "validation.ageRange" }),
  ]),
  gender: z.union([z.literal(""), z.enum(GENDERS, { error: "validation.invalid" })]),
  adult: adultSchema,
  country: text(80),
  city: text(80),
  nationality: text(80),
  phone: phoneSchema,
  email: emailSchema,
  languages: text(200),
  englishLevel: z.enum(ENGLISH_LEVELS, { error: "validation.required" }),
  otherLanguages: text(200),
  previousEmployment: text(200),
  previousPosition: text(120),
  yearsExperience: z.coerce
    .number({ error: "validation.required" })
    .min(0, { error: "validation.invalid" })
    .max(60, { error: "validation.invalid" }),
  previousExperience: text(2000),
  whyInterested: text(2000),
  workEnvironment: text(2000),
  lookingFor: text(2000),
});
export type FullProfileInput = z.input<typeof fullProfileSchema>;

export const profileSaveSchema = z.strictObject({
  jobId: z.guid(),
  profile: z
    .record(z.string().max(40), z.union([z.string().max(2000), z.number()]))
    .refine((r) => Object.keys(r).length <= 40, { message: "validation.invalid" }),
});

export const cvUploadSchema = z.strictObject({
  jobId: z.guid(),
  kind: z.enum(["pdf", "docx"]),
});
export const cvConfirmSchema = z.strictObject({ jobId: z.guid(), path: z.string().max(300) });
