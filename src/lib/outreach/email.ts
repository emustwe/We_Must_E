import { COMPANY } from "@/lib/company";
import { OUTREACH_SENDER, OUTREACH_THUMB_PATH } from "@/lib/outreach/config";
import { firstName } from "@/lib/outreach/parse";

// The outreach email, ready to paste into the team's mailbox: a subject, a
// designed version (inline styles only, so Gmail, Outlook and Zoho keep it)
// and a plain-text version. One email per contact, with their private link.

export type OutreachEmail = { subject: string; html: string; text: string };

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const outreachLink = (site: string, token: string) => `${site}/w/${token}`;
export const outreachUnsubscribeLink = (site: string, token: string) =>
  `${site}/w/${token}/unsubscribe`;

export function outreachEmail({
  site,
  token,
  name,
  company,
}: {
  site: string;
  token: string;
  name: string;
  company: string;
}): OutreachEmail {
  const link = outreachLink(site, token);
  const unsubscribe = outreachUnsubscribeLink(site, token);
  const thumb = `${site}${OUTREACH_THUMB_PATH}`;
  const hi = firstName(name);
  const siteLabel = site.replace(/^https?:\/\//, "");
  const sender = OUTREACH_SENDER;
  const legal = [COMPANY.legalName, COMPANY.address].filter(Boolean).join(", ");

  const subject = `Hiring at ${company}? A short video for you`;
  const points = [
    "Your jobs appear on a live map, so people near your workplace find them.",
    "Every candidate takes three steps before you see them: Exam (a short test), Execute (their details and video answers) and Engage (a survey).",
    "You see every full application for free, and pay only to open the contact details of the people you want.",
  ];

  const p = (html: string) =>
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1F2937">${html}</p>`;
  const html = [
    `<div style="max-width:560px;font-family:Arial,Helvetica,sans-serif;color:#1F2937">`,
    p(`Hi ${esc(hi)},`),
    p(
      `I noticed that ${esc(company)} is hiring. I'd like to show you WemustE, a job map where people near your workplace find your jobs.`,
    ),
    p(`We made a short video to show you how it works:`),
    `<p style="margin:0 0 16px"><a href="${esc(link)}" target="_blank" style="text-decoration:none"><img src="${esc(thumb)}" width="520" alt="Watch the video: WemustE for employers" style="display:block;width:100%;max-width:520px;height:auto;border:0;border-radius:14px"></a></p>`,
    `<ul style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.6;color:#1F2937">`,
    ...points.map((t) => `<li style="margin:0 0 6px">${esc(t)}</li>`),
    `</ul>`,
    `<p style="margin:0 0 20px"><a href="${esc(link)}" target="_blank" style="display:inline-block;background:#2457F5;color:#FFFFFF;font-size:15px;font-weight:bold;text-decoration:none;padding:12px 22px;border-radius:12px">&#9654;&nbsp; Watch the video</a></p>`,
    p(
      `If it looks useful, you can become a sponsor from the same page. Any questions? Just reply to this email.`,
    ),
    p(
      [
        "Best regards,",
        esc(sender.name),
        sender.title ? `${esc(sender.title)}, WemustE` : null,
        `<a href="${esc(site)}" target="_blank" style="color:#2457F5;text-decoration:none">${esc(siteLabel)}</a>`,
      ]
        .filter(Boolean)
        .join("<br>"),
    ),
    `<p style="margin:24px 0 0;padding-top:12px;border-top:1px solid #E5E7EB;font-size:12px;line-height:1.5;color:#6B7280">You're getting this one email because ${esc(company)} is hiring. Don't want to hear from us? <a href="${esc(unsubscribe)}" target="_blank" style="color:#6B7280">Unsubscribe</a>.${legal ? `<br>${esc(legal)}` : ""}</p>`,
    `</div>`,
  ].join("\n");

  const text = [
    `Hi ${hi},`,
    "",
    `I noticed that ${company} is hiring. I'd like to show you WemustE, a job map where people near your workplace find your jobs.`,
    "",
    `We made a short video to show you how it works: ${link}`,
    "",
    ...points.map((t) => `- ${t}`),
    "",
    "If it looks useful, you can become a sponsor from the same page. Any questions? Just reply to this email.",
    "",
    "Best regards,",
    sender.name,
    ...(sender.title ? [`${sender.title}, WemustE`] : []),
    siteLabel,
    "",
    "--",
    `You're getting this one email because ${company} is hiring. Don't want to hear from us? Unsubscribe: ${unsubscribe}`,
    ...(legal ? [legal] : []),
  ].join("\n");

  return { subject, html, text };
}
