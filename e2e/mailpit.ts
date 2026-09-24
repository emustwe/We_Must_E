const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

// Waits for the newest email to `to` and returns the first /auth/confirm link in it.
export async function waitForAuthLink(
  to: string,
  since: Date,
  timeoutMs = 20_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    const { messages = [] } = (await res.json()) as {
      messages?: { ID: string; Created: string }[];
    };
    const fresh = messages.find((m) => new Date(m.Created) >= since);
    if (fresh) {
      const message = (await (await fetch(`${MAILPIT}/api/v1/message/${fresh.ID}`)).json()) as {
        HTML: string;
      };
      const match = message.HTML.match(/href="([^"]*\/auth\/confirm[^"]*)"/);
      if (match) return match[1].replace(/&amp;/g, "&");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No auth email for ${to}`);
}
