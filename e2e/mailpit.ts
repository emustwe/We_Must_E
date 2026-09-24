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

// Waits for an email to `to` whose subject matches, and returns its content.
export async function waitForEmail(to: string, subject: RegExp, since: Date, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    const { messages = [] } = (await res.json()) as {
      messages?: { ID: string; Created: string; Subject: string }[];
    };
    const match = messages.find((m) => new Date(m.Created) >= since && subject.test(m.Subject));
    if (match) {
      const message = (await (await fetch(`${MAILPIT}/api/v1/message/${match.ID}`)).json()) as {
        HTML: string;
        Text: string;
      };
      return { subject: match.Subject, html: message.HTML, text: message.Text };
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No email "${subject}" for ${to}`);
}

// The 6-digit activation code from the newest signup email.
export async function waitForSignupCode(to: string, since: Date) {
  const email = await waitForEmail(to, /activation code/i, since);
  const match = email.text.match(/\b(\d{6})\b/);
  if (!match) throw new Error("No 6-digit code in the email");
  return match[1];
}
