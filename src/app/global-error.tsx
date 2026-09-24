"use client";

// Last-resort boundary (root layout failed, so no i18n or styles are available).
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{ fontFamily: "system-ui, sans-serif", textAlign: "center", padding: "6rem 1rem" }}
      >
        <h1>Something went wrong</h1>
        <p>Please try again in a moment.</p>
        <button type="button" onClick={reset} style={{ minHeight: 44, padding: "0 1.25rem" }}>
          Try again
        </button>
      </body>
    </html>
  );
}
