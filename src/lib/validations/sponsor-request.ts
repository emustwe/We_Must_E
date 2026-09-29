import { emailSchema } from "@/lib/validations/auth";
import { z } from "@/lib/validations/zod";

const text = (min: number, max: number, required: string) =>
  z.string().trim().min(min, { error: required }).max(max, { error: "validation.tooLong" });

// "Become a sponsor": what a company sends to the WemustE team.
export const sponsorRequestSchema = z.strictObject({
  companyName: text(2, 160, "validation.companyRequired"),
  contactPerson: text(2, 120, "validation.nameRequired"),
  email: emailSchema,
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9][0-9 ()-]{6,19}$/, { error: "validation.phoneInvalid" }),
  city: text(1, 120, "validation.cityRequired"),
  website: z
    .union([z.url({ protocol: /^https?$/, error: "validation.websiteInvalid" }), z.literal("")])
    .optional(),
  message: z.string().trim().max(2000, { error: "validation.tooLong" }).optional(),
  // A salesperson's referral code (optional); checked on the server.
  referralCode: z
    .union([
      z
        .string()
        .trim()
        .regex(/^[A-Za-z0-9-]{3,20}$/, { error: "validation.referralInvalid" }),
      z.literal(""),
    ])
    .optional(),
  captchaToken: z.string().max(2048).optional(),
});
export type SponsorRequestInput = z.input<typeof sponsorRequestSchema>;

// A new salesperson: their referral code and a nickname.
export const salespersonSchema = z.strictObject({
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{3,20}$/, { error: "validation.referralInvalid" }),
  nickname: text(2, 60, "validation.nameRequired"),
});

export const handleSponsorRequestSchema = z.strictObject({
  requestId: z.guid(),
  status: z.enum(["approved", "declined"]),
});
