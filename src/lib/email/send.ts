import "server-only";
import { render } from "@react-email/render";
import { TEMPLATES, type EmailKind } from "@/emails/templates";
import { clientEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import { logError } from "@/lib/log";

// Sends one transactional email. Resend in production; Mailpit over SMTP in
// local development. Never logs recipients or content.
export async function sendEmail(kind: EmailKind, to: string) {
  const template = TEMPLATES[kind];
  const element = template.render(clientEnv.NEXT_PUBLIC_SITE_URL);
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  const message = { from: serverEnv.EMAIL_FROM, to, subject: template.subject, html, text };

  try {
    if (serverEnv.RESEND_API_KEY) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${serverEnv.RESEND_API_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(message),
      });
      if (!res.ok) logError(`email-${kind}`, { name: "ResendError", status: res.status });
      return;
    }
    if (serverEnv.SMTP_URL) {
      const { createTransport } = await import("nodemailer");
      await createTransport(serverEnv.SMTP_URL).sendMail(message);
      return;
    }
    console.warn(
      JSON.stringify({
        level: "warn",
        context: `email-${kind}`,
        message: "no email transport configured",
      }),
    );
  } catch (error) {
    logError(`email-${kind}`, error);
  }
}
