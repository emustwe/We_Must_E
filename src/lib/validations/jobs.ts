import { z } from "zod";
import { AVAILABILITY, CITIES, JOB_CATEGORIES, PAY_PERIODS } from "@/lib/jobs/meta";
import { emailSchema, newPasswordSchema } from "@/lib/validations/auth";

export const idSchema = z.uuid({ error: "validation.invalid" });

export const jobRequestSchema = z.strictObject({
  jobId: idSchema,
  message: z.string().trim().max(500, { error: "validation.messageTooLong" }).optional(),
});

const money = z.coerce
  .number({ error: "validation.payInvalid" })
  .min(0, { error: "validation.payInvalid" })
  .max(1_000_000, { error: "validation.payInvalid" });

// Rough UAE bounding box; keeps pins on the map we actually serve.
const UAE = { south: 22.5, north: 26.5, west: 51.0, east: 56.6 };

export const jobSchema = z
  .strictObject({
    title: z
      .string()
      .trim()
      .min(3, { error: "validation.titleRequired" })
      .max(120, { error: "validation.titleTooLong" }),
    description: z
      .string()
      .trim()
      .min(10, { error: "validation.descriptionRequired" })
      .max(2000, { error: "validation.descriptionTooLong" }),
    category: z.enum(JOB_CATEGORIES, { error: "validation.categoryRequired" }),
    schedule: z
      .array(z.enum(AVAILABILITY))
      .min(1, { error: "validation.scheduleRequired" })
      .max(5)
      .transform((values) => [...new Set(values)]),
    payMin: money,
    // Blank must be checked first: z.coerce.number() would turn "" into 0.
    payMax: z.union([z.literal("").transform(() => undefined), money]).optional(),
    payPeriod: z.enum(PAY_PERIODS, { error: "validation.payPeriodRequired" }),
    spots: z.coerce
      .number()
      .int()
      .min(1, { error: "validation.spotsInvalid" })
      .max(100, { error: "validation.spotsInvalid" }),
    cityEmirate: z.enum(CITIES.map((c) => c.id) as [string, ...string[]], {
      error: "validation.cityRequired",
    }),
    areaLabel: z
      .string()
      .trim()
      .min(2, { error: "validation.areaRequired" })
      .max(80, { error: "validation.areaTooLong" }),
    address: z.string().trim().max(300, { error: "validation.addressTooLong" }).optional(),
    lat: z
      .number({ error: "validation.locationRequired" })
      .min(UAE.south, { error: "validation.locationUae" })
      .max(UAE.north, { error: "validation.locationUae" }),
    lng: z
      .number({ error: "validation.locationRequired" })
      .min(UAE.west, { error: "validation.locationUae" })
      .max(UAE.east, { error: "validation.locationUae" }),
    startsOn: z.union([z.iso.date(), z.literal("").transform(() => undefined)]).optional(),
    expiresInDays: z.coerce
      .number()
      .pipe(z.union([z.literal(7), z.literal(14), z.literal(30), z.literal(60), z.literal(90)])),
  })
  .refine((job) => job.payMax === undefined || job.payMax >= job.payMin, {
    error: "validation.payMaxBelowMin",
    path: ["payMax"],
  });

export type JobInput = z.input<typeof jobSchema>;

export const jobStatusSchema = z.strictObject({
  jobId: idSchema,
  status: z.enum(["open", "paused", "closed"]),
});

export const applicationResponseSchema = z.strictObject({
  applicationId: idSchema,
  accept: z.boolean(),
});

export const setInitialPasswordSchema = z
  .strictObject({ password: newPasswordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    error: "validation.passwordMismatch",
    path: ["confirmPassword"],
  });

export const createEmployerSchema = z.strictObject({
  companyName: z
    .string()
    .trim()
    .min(2, { error: "validation.companyRequired" })
    .max(160, { error: "validation.companyTooLong" }),
  contactPerson: z
    .string()
    .trim()
    .min(2, { error: "validation.nameRequired" })
    .max(120, { error: "validation.nameTooLong" }),
  email: emailSchema,
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9][0-9 ()-]{6,19}$/, { error: "validation.phoneInvalid" }),
  tradeLicenseNo: z.string().trim().max(64, { error: "validation.licenseTooLong" }).optional(),
  website: z
    .union([z.url({ protocol: /^https?$/, error: "validation.websiteInvalid" }), z.literal("")])
    .optional(),
});

export type CreateEmployerInput = z.input<typeof createEmployerSchema>;

export const employerStatusSchema = z.strictObject({
  employerId: idSchema,
  status: z.enum(["approved", "suspended"]),
});
