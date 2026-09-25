"use client";

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import type { Ref } from "react";
import { clientEnv } from "@/lib/env";

export const captchaEnabled = Boolean(clientEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

// Cloudflare Turnstile, verified by Supabase Auth. Renders nothing when no site
// key is configured (local development with captcha disabled in Supabase).
export function Captcha({
  ref,
  onToken,
  onFailed,
}: {
  ref?: Ref<TurnstileInstance | undefined>;
  onToken: (token: string | undefined) => void;
  onFailed?: () => void;
}) {
  const siteKey = clientEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) return null;
  return (
    <Turnstile
      ref={ref}
      siteKey={siteKey}
      options={{ theme: "auto", size: "flexible", appearance: "interaction-only" }}
      onSuccess={(token) => onToken(token)}
      onExpire={() => onToken(undefined)}
      onError={() => {
        onToken(undefined);
        onFailed?.();
      }}
    />
  );
}
