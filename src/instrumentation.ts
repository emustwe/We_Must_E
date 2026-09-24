// Validate configuration once at server start so a missing variable fails the
// deployment immediately instead of on the first request that needs it.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./lib/env");
    await import("./lib/env.server");
  }
}
