import { z } from "@/lib/validations/zod";
import { emailSchema, newPasswordSchema } from "@/lib/validations/auth";

export const idSchema = z.guid({ error: "validation.invalid" });

// Employers fill exactly three things: title, description and a map location.
// The service-area check (JOB_AREA_BOUNDS) happens in the server action.
export const jobSchema = z.strictObject({
  title: z
    .string()
    .trim()
    .min(3, { error: "validation.titleRequired" })
    .max(120, { error: "validation.titleTooLong" }),
  description: z
    .string()
    .trim()
    .min(10, { error: "validation.descriptionRequired" })
    .max(3000, { error: "validation.descriptionTooLong" }),
  locationLabel: z
    .string()
    .trim()
    .min(2, { error: "validation.locationRequired" })
    .max(200, { error: "validation.areaTooLong" }),
  lat: z.number({ error: "validation.locationRequired" }).min(-90).max(90),
  lng: z.number({ error: "validation.locationRequired" }).min(-180).max(180),
});
export type JobInput = z.input<typeof jobSchema>;

export const jobStatusSchema = z.strictObject({
  jobId: idSchema,
  status: z.literal("closed"),
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
