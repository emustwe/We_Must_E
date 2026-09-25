import "server-only";
import { render } from "@react-email/render";
import type { ReactElement } from "react";
import { TEMPLATES, type EmailKind, type LoginDetails } from "@/emails/templates";
import { clientEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import { logError } from "@/lib/log";

// Sends one transactional email. Resend in production; Mailpit over SMTP in
// local development. Never logs recipients or content.
export async function sendEmail(kind: "newApplication", to: string): Promise<boolean>;
export async function sendEmail(
  kind: "sponsorAccount" | "sponsorPassword",
  to: string,
  login: LoginDetails,
): Promise<boolean>;
export async function sendEmail(kind: EmailKind, to: string, login?: LoginDetails) {
  const template = TEMPLATES[kind];
  const renderTemplate = template.render as (site: string, login?: LoginDetails) => ReactElement;
  const element = renderTemplate(clientEnv.NEXT_PUBLIC_SITE_URL, login);
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  const message = { from: serverEnv.EMAIL_FROM, to, subject: template.subject, html, text };

  try {
    if (serverEnv.RESEND_API_KEY) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${serverEnv.RESEND_API_KEY}`,
          "content-type": "application/json",
          // Resend's edge rejects some default client user agents (Cloudflare 1010).
          "user-agent": "wemuste-app/1.0",
        },
        body: JSON.stringify(message),
      });
      if (!res.ok) logError(`email-${kind}`, { name: "ResendError", status: res.status });
      return res.ok;
    }
    if (serverEnv.SMTP_URL) {
      const { createTransport } = await import("nodemailer");
      await createTransport(serverEnv.SMTP_URL).sendMail(message);
      return true;
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
  return false;
}
