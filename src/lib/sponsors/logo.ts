import { clientEnv } from "@/lib/env";

export const LOGO_BUCKET = "sponsor-logos";
export const LOGO_MAX_BYTES = 1024 * 1024;

// Logos are public images (they appear on the public map).
export function logoUrl(path: string | null | undefined) {
  return path
    ? `${clientEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${LOGO_BUCKET}/${path}`
    : null;
}
