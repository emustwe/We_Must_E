import { OUTREACH_MAX_BATCH } from "@/lib/outreach/parse";
import { z } from "@/lib/validations/zod";

// Contacts an admin adds (already read from the pasted list in the browser;
// checked again here).
export const outreachAddSchema = z.strictObject({
  contacts: z
    .array(
      z.strictObject({
        name: z.string().trim().min(1).max(120),
        company: z.string().trim().min(1).max(160),
        email: z.email().max(254),
        country: z.string().trim().max(60).optional(),
      }),
    )
    .min(1)
    .max(OUTREACH_MAX_BATCH),
  salespersonId: z.union([z.guid(), z.literal("")]).optional(),
});

export const outreachUpdateSchema = z.strictObject({
  id: z.guid(),
  action: z.enum(["sent", "link_off", "link_on", "delete"]),
});
