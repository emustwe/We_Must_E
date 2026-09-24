import { getRequestConfig } from "next-intl/server";

// English only for now. Adding Arabic/Urdu/Hindi means adding messages/<locale>.json
// and choosing the locale here (cookie or Accept-Language); layouts already use
// logical (start/end) properties so RTL works without restyling.
export const locales = ["en"] as const;
export const rtlLocales: readonly string[] = ["ar", "ur"];

export default getRequestConfig(async () => {
  const locale = "en";
  return {
    locale,
    // One reference time and zone per request keeps "2 hours ago" and dates
    // identical on the server and in the browser (no hydration mismatch).
    now: new Date(),
    timeZone: "Asia/Dubai",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
