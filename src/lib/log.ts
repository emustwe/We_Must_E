import "server-only";

// Server-side error logging without personal data: only a context label and
// the error's code/status/name, never messages that may echo user input.
export function logError(context: string, error: unknown) {
  const details =
    error && typeof error === "object"
      ? {
          name: (error as { name?: unknown }).name,
          code: (error as { code?: unknown }).code,
          status: (error as { status?: unknown }).status,
        }
      : { type: typeof error };
  console.error(JSON.stringify({ level: "error", context, ...details }));
}
