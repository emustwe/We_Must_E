import { COMPANY } from "@/lib/company";
import { OUTREACH_SENDER, OUTREACH_THUMB_PATH } from "@/lib/outreach/config";

// The outreach email, ready to paste into the team's mailbox: a subject, a
// designed version (inline styles only, so Gmail, Outlook and Zoho keep it)
// and a plain-text version. One email per contact, with their private link.

export type OutreachEmail = { subject: string; html: string; text: string };

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const outreachLink = (site: string, token: string) => `${site}/w/${token}`;
export const outreachUnsubscribeLink = (site: string, token: string) =>
  `${site}/w/${token}/unsubscribe`;

// The text is the same for every company (no name in it); each one only
// differs by its private link.
export function outreachEmail({ site, token }: { site: string; token: string }): OutreachEmail {
  const link = outreachLink(site, token);
  const unsubscribe = outreachUnsubscribeLink(site, token);
  const thumb = `${site}${OUTREACH_THUMB_PATH}`;
  const sender = OUTREACH_SENDER;
  const legal = [COMPANY.legalName, COMPANY.address].filter(Boolean).join(", ");

  // The team's own words (2026-10-01), used as written; only the picture with
  // the private link and the unsubscribe line are added.
  const subject = "The Next Generation of Hiring";
  const before = [
    "We’re introducing a different way for companies to find and evaluate people.",
    "Tell us the person you need and what the job involves.",
    "We build a customized process around it — including practical tasks, tests, questions, surveys and work-style assessments.",
    "Candidates can also submit a personal video, giving you a chance to see how they communicate, think and present themselves before you meet them.",
    "You can use the same approach to find freelancers, contractors, sales people, creators, partners, service providers — or even people to sponsor for a specific opportunity.",
    "Provide the opportunity for locals.",
    "We build the experience that lets people prove they are the right fit. Let employee prove themselves before you choose them.",
    "This is a new way to discover people beyond a CV.",
  ];
  const ask = ["Give us one position, project or opportunity to prove.", "We’ll build the process."];

  const p = (html: string) =>
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1F2937">${html}</p>`;
  const html = [
    `<div style="max-width:560px;font-family:Arial,Helvetica,sans-serif;color:#1F2937">`,
    p("Hi,"),
    ...before.map((t) => p(esc(t))),
    p(ask.map(esc).join("<br>")),
    `<p style="margin:0 0 16px"><a href="${esc(link)}" target="_blank" style="text-decoration:none"><img src="${esc(thumb)}" width="520" alt="Watch the WemustE video" style="display:block;width:100%;max-width:520px;height:auto;border:0;border-radius:14px"></a></p>`,
    p(`Best,<br>${esc(sender.name)}`),
    `<p style="margin:24px 0 0;padding-top:12px;border-top:1px solid #E5E7EB;font-size:12px;line-height:1.5;color:#6B7280">Don't want to hear from us? <a href="${esc(unsubscribe)}" target="_blank" style="color:#6B7280">Unsubscribe</a>.${legal ? `<br>${esc(legal)}` : ""}</p>`,
    `</div>`,
  ].join("\n");

  const text = [
    "Hi,",
    "",
    ...before.flatMap((t) => [t, ""]),
    ...ask,
    "",
    `Watch the video: ${link}`,
    "",
    "Best,",
    sender.name,
    "",
    "--",
    `Don't want to hear from us? Unsubscribe: ${unsubscribe}`,
    ...(legal ? [legal] : []),
  ].join("\n");

  return { subject, html, text };
}
