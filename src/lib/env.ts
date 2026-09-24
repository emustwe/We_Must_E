import { z } from "@/lib/validations/zod";

// Public configuration only. Server secrets live in env.server.ts, which is
// guarded by `server-only` so it can never end up in a browser bundle.
const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_SITE_URL: z.url(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  // MapTiler key (domain-restricted in MapTiler): map tiles + place search.
  NEXT_PUBLIC_GEOCODING_API_KEY: z.string().min(8),
  // Raster tile URL; {key} is replaced with the key above.
  NEXT_PUBLIC_MAP_TILE_URL: z
    .string()
    .default("https://api.maptiler.com/maps/pastel/256/{z}/{x}/{y}{r}.png?key={key}"),
  NEXT_PUBLIC_MAP_TILE_URL_DARK: z
    .string()
    .default("https://api.maptiler.com/maps/dataviz-dark/256/{z}/{x}/{y}{r}.png?key={key}"),
  NEXT_PUBLIC_MAP_ATTRIBUTION: z
    .string()
    .default(
      '© <a href="https://www.maptiler.com/copyright/">MapTiler</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    ),
});

// Each variable is referenced by its full name so Next.js can inline it.
const parsed = clientSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined,
  NEXT_PUBLIC_GEOCODING_API_KEY: process.env.NEXT_PUBLIC_GEOCODING_API_KEY,
  NEXT_PUBLIC_MAP_TILE_URL: process.env.NEXT_PUBLIC_MAP_TILE_URL || undefined,
  NEXT_PUBLIC_MAP_TILE_URL_DARK: process.env.NEXT_PUBLIC_MAP_TILE_URL_DARK || undefined,
  NEXT_PUBLIC_MAP_ATTRIBUTION: process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || undefined,
});

if (!parsed.success) {
  // Names only, never values.
  const names = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(`Invalid or missing public environment variables: ${names}`);
}

export const clientEnv = parsed.data;
