import { z } from "@/lib/validations/zod";

// Messages are keys into messages/*.json ("validation" namespace) so the same
// schema produces translated errors on the client and the server.

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, { error: "validation.emailInvalid" })
  .pipe(z.email({ error: "validation.emailInvalid" }));

export const newPasswordSchema = z
  .string()
  .min(10, { error: "validation.passwordTooShort" })
  // bcrypt, used by Supabase Auth, ignores bytes beyond 72.
  .max(72, { error: "validation.passwordTooLong" });

const captchaTokenSchema = z.string().max(4096).optional();

export const loginSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1, { error: "validation.passwordRequired" }).max(72),
  captchaToken: captchaTokenSchema,
});

export const forgotPasswordSchema = z.strictObject({
  email: emailSchema,
  captchaToken: captchaTokenSchema,
});

export const resetPasswordSchema = z
  .strictObject({
    password: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    error: "validation.passwordMismatch",
    path: ["confirmPassword"],
  });

export const mfaCodeSchema = z.strictObject({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, { error: "validation.mfaCode" }),
});

export type LoginInput = z.input<typeof loginSchema>;
export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;

// Flatten Zod issues into { field: messageKey } for the form.
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.join(".");
    if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
  }
  return fieldErrors;
}
