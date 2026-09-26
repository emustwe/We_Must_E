"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/session";
import { dbFail } from "@/lib/db-errors";
import { logError } from "@/lib/log";
import { fail, ok, type ActionResult } from "@/lib/result";
import { detectFileKind } from "@/lib/security/file-signature";
import { withinRateLimit } from "@/lib/security/rate-limit";
import { LOGO_BUCKET, LOGO_MAX_BYTES } from "@/lib/sponsors/logo";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validations/jobs";

const TYPES = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp" } as const;

// Sets a sponsor's logo. Allowed for an MFA admin (any sponsor) or an approved
// sponsor (their own). The database function checks that before anything is
// stored, and logs it. The file type comes from its bytes, never its name.
export async function uploadSponsorLogo(formData: FormData): Promise<ActionResult> {
  const employerId = idSchema.safeParse(formData.get("employerId"));
  const file = formData.get("logo");
  if (!employerId.success || !(file instanceof File)) return fail("invalidInput");
  if (file.size < 1 || file.size > LOGO_MAX_BYTES) return fail("fileTooBig");
  const profile = await getCurrentProfile();
  if (!profile) return fail("forbidden");
  if (!(await withinRateLimit("uploadPerUser", profile.id))) return fail("rateLimited");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = detectFileKind(bytes.subarray(0, 16));
  if (kind !== "png" && kind !== "jpeg" && kind !== "webp") return fail("invalidFile");

  const supabase = await createClient();
  const { error: logErr } = await supabase.rpc("log_sponsor_change", {
    p_employer_id: employerId.data,
    p_change: "logo",
  });
  if (logErr) return dbFail("sponsor-logo-log", logErr);

  // Service role: the logo is written only after the checks above (no client
  // can write to the bucket or change a sponsor profile directly).
  const service = createAdminClient();
  // A random folder: the public logo URL must not reveal the sponsor's account id.
  const path = `${randomUUID()}/${randomUUID()}.${kind === "jpeg" ? "jpg" : kind}`;
  const { error: uploadError } = await service.storage
    .from(LOGO_BUCKET)
    .upload(path, bytes, { contentType: TYPES[kind], cacheControl: "31536000", upsert: false });
  if (uploadError) {
    logError("sponsor-logo-upload", uploadError);
    return fail("uploadFailed");
  }
  const { data: before } = await service
    .from("employer_profiles")
    .select("logo_path")
    .eq("user_id", employerId.data)
    .single();
  const { error } = await service
    .from("employer_profiles")
    .update({ logo_path: path })
    .eq("user_id", employerId.data);
  if (error) {
    await service.storage.from(LOGO_BUCKET).remove([path]);
    return dbFail("sponsor-logo-save", error);
  }
  if (before?.logo_path) await service.storage.from(LOGO_BUCKET).remove([before.logo_path]);

  revalidatePath("/", "layout");
  return ok(undefined);
}
