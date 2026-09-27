import { emailSchema } from "@/lib/validations/auth";
import { z } from "@/lib/validations/zod";

const text = (min: number, max: number, required: string) =>
  z.string().trim().min(min, { error: required }).max(max, { error: "validation.tooLong" });

// "Become a sponsor": what a company sends to the Wemuste team.
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
  captchaToken: z.string().max(2048).optional(),
});
export type SponsorRequestInput = z.input<typeof sponsorRequestSchema>;

export const handleSponsorRequestSchema = z.strictObject({
  requestId: z.guid(),
  status: z.enum(["approved", "declined"]),
});
