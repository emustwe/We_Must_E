import "server-only";
import { render } from "@react-email/render";
import type { ReactElement } from "react";
import {
  TEMPLATES,
  type ApplicationDetails,
  type EmailKind,
  type InviteDetails,
} from "@/emails/templates";
import { clientEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import { logError } from "@/lib/log";

// Sends one transactional email. Resend in production; Mailpit over SMTP in
// local development. Never logs recipients or content.
// Emails always come from "Muste", whatever display name EMAIL_FROM has
// (the address stays the verified one, e.g. no-reply@wemuste.com).
const FROM = `Muste <${serverEnv.EMAIL_FROM.match(/<([^>]+)>/)?.[1] ?? serverEnv.EMAIL_FROM.trim()}>`;

export async function sendEmail(
  kind:
    | "newApplication"
    | "newJob"
    | "newSponsorRequest"
    | "jobApproved"
    | "jobRejected"
    | "newCandidate"
    | "newPayment"
    | "paymentReceived",
  to: string,
): Promise<boolean>;
export async function sendEmail(
  kind: "sponsorInvite",
  to: string,
  invite: InviteDetails,
): Promise<boolean>;
export async function sendEmail(
  kind: "applicationReceived" | "jobClosed",
  to: string,
  app: ApplicationDetails,
): Promise<boolean>;
export async function sendEmail(
  kind: EmailKind,
  to: string,
  data?: InviteDetails | ApplicationDetails,
) {
  const template = TEMPLATES[kind];
  const renderTemplate = template.render as (
    site: string,
    data?: InviteDetails | ApplicationDetails,
  ) => ReactElement;
  const element = renderTemplate(clientEnv.NEXT_PUBLIC_SITE_URL, data);
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  const message = { from: FROM, to, subject: template.subject, html, text };

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

// The same email to many people (one message each, nobody sees the others'
// addresses). Resend's batch API takes up to 100 at a time.
export async function sendEmailToMany(
  kind: "jobClosed",
  recipients: string[],
  app: ApplicationDetails,
): Promise<number> {
  if (!recipients.length) return 0;
  if (!serverEnv.RESEND_API_KEY) {
    let sent = 0;
    for (const to of recipients) if (await sendEmail(kind, to, app)) sent++;
    return sent;
  }
  const template = TEMPLATES[kind];
  const element = template.render(clientEnv.NEXT_PUBLIC_SITE_URL, app);
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  let sent = 0;
  for (let i = 0; i < recipients.length; i += 100) {
    const batch = recipients.slice(i, i + 100).map((to) => ({
      from: FROM,
      to,
      subject: template.subject,
      html,
      text,
    }));
    try {
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          authorization: `Bearer ${serverEnv.RESEND_API_KEY}`,
          "content-type": "application/json",
          "user-agent": "wemuste-app/1.0",
        },
        body: JSON.stringify(batch),
      });
      if (res.ok) sent += batch.length;
      else logError(`email-${kind}-batch`, { name: "ResendError", status: res.status });
    } catch (error) {
      logError(`email-${kind}-batch`, error);
    }
  }
  return sent;
}
