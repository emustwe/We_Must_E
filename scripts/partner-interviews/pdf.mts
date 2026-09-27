// Prints every partner role's interview (Test, Video interview) and the shared
// Survey to one PDF in the project folder (not tracked by git):
//
//   npx tsx scripts/partner-interviews/pdf.mts
//
// Run it again after adding a role, and the PDF is rebuilt with it.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { REAL_SURVEY } from "../real-survey.mjs";
import { ROLES, buildTest, buildVideos } from "./build.mjs";

const OUT = join(import.meta.dirname, "..", "..", "partner-interviews.pdf");

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// The first line of a question is its heading.
const rich = (s: string) => {
  const [head, ...rest] = s.split("\n");
  return `<b>${esc(head)}</b>${rest.length ? `\n${esc(rest.join("\n"))}` : ""}`;
};
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const date = new Date().toLocaleDateString("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const office = ROLES.filter((r) => r.typing).map((r) => r.title);

const rolePages = ROLES.map((role) => {
  const test = buildTest(role)
    .map(
      (q) =>
        `<li><div class="q">${rich(q.prompt)}</div>${
          q.type === "typing"
            ? `<div class="typing"><span>Paragraph to type (${q.time} seconds)</span>${esc(q.options?.[0] ?? "")}</div>`
            : ""
        }</li>`,
    )
    .join("");
  const videos = buildVideos(role)
    .map((v) => `<li><div class="q">${rich(v)}</div></li>`)
    .join("");
  return `<section class="role" id="${slug(role.title)}">
    <header><p class="kicker">Partner job interview</p><h2>${esc(role.title)}</h2>
    <p class="meta">Test 25 questions · 25 min &nbsp;|&nbsp; Video 7 × 30 s · 25 min &nbsp;|&nbsp; Survey 25 questions · 25 min (shared, see the end)</p></header>
    <h3>Test</h3><ol class="qs">${test}</ol>
    <h3>Video interview</h3><ol class="qs">${videos}</ol>
  </section>`;
}).join("");

const survey = REAL_SURVEY.map(
  (q) =>
    `<li><div class="q">${rich(q.prompt)}</div>${
      q.options?.length
        ? `<div class="opts">${q.type === "multi_choice" ? "Choose any" : "Choose one"}: ${q.options.map(esc).join(" · ")}</div>`
        : `<div class="opts">Written answer</div>`
    }</li>`,
).join("");

const html = `<!doctype html><html><head><meta charset="utf-8"><title>Partner job interviews</title>
<style>
  @page { size: A4; margin: 16mm 15mm 18mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #0B1220; font-size: 10.5pt; line-height: 1.45; margin: 0; }
  h1 { font-size: 26pt; margin: 0 0 4mm; letter-spacing: -0.5px; }
  h2 { font-size: 19pt; margin: 0; letter-spacing: -0.3px; }
  h3 { font-size: 12.5pt; color: #2457F5; margin: 7mm 0 2mm; border-bottom: 1.5px solid #2457F5; padding-bottom: 1mm; }
  .cover { page-break-after: always; }
  .brand { display: inline-flex; align-items: center; gap: 3mm; margin-bottom: 14mm; font-weight: 800; font-size: 14pt; }
  .brand b { display: inline-flex; width: 10mm; height: 10mm; border-radius: 3mm; background: #2457F5; color: #fff; align-items: center; justify-content: center; }
  .lead { color: #4A5568; font-size: 11.5pt; max-width: 150mm; }
  table.pattern { border-collapse: collapse; margin: 7mm 0; width: 100%; }
  table.pattern td, table.pattern th { border: 1px solid #D5DBE5; padding: 2.2mm 3mm; text-align: left; vertical-align: top; }
  table.pattern th { background: #EEF3FF; }
  table.pattern td:last-child { white-space: nowrap; }
  .toc { columns: 3; column-gap: 6mm; padding: 0; list-style: none; margin: 3mm 0 0; }
  .toc li { break-inside: avoid; padding: 0.8mm 0; }
  .toc a { color: #0B1220; text-decoration: none; }
  .note { color: #4A5568; font-size: 9.5pt; margin-top: 6mm; }
  .role { page-break-before: always; }
  .kicker { margin: 0 0 1mm; color: #2457F5; font-weight: 700; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.8px; }
  .meta { margin: 2mm 0 0; color: #4A5568; font-size: 9pt; }
  ol.qs { margin: 0; padding-left: 7mm; }
  ol.qs li { margin: 0 0 3mm; padding-left: 1mm; break-inside: avoid; }
  .q { white-space: pre-wrap; }
  .typing { margin-top: 1.5mm; padding: 2.5mm 3mm; background: #F4F6FA; border-left: 3px solid #2457F5; white-space: pre-wrap; }
  .typing span { display: block; font-weight: 700; font-size: 8.5pt; color: #4A5568; margin-bottom: 1mm; }
  .opts { margin-top: 1mm; color: #4A5568; font-size: 9.5pt; }
</style></head><body>
<section class="cover">
  <div class="brand"><b>W</b> Wemuste</div>
  <h1>Partner job interviews</h1>
  <p class="lead">One interview for each partner role, in the same pattern as the real job (Online Office &amp; Translation Administrator). Every partner job with that title uses its role's interview.</p>
  <table class="pattern">
    <tr><th>Section</th><th>What the applicant does</th><th>Time</th></tr>
    <tr><td>Test</td><td>25 written questions: 16 about the role, 9 the same for every role. Office roles start with a typing test.</td><td>25 min</td></tr>
    <tr><td>Task</td><td>Full profile, CV and 7 video answers (30 seconds each): 4 about the role, 3 the same for every role.</td><td>25 min</td></tr>
    <tr><td>Survey</td><td>The real job's survey (25 questions), the same for every role.</td><td>25 min</td></tr>
  </table>
  <p><b>${ROLES.length} roles</b> · updated ${esc(date)}</p>
  <ol class="toc">${ROLES.map((r) => `<li><a href="#${slug(r.title)}">${esc(r.title)}</a></li>`).join("")}</ol>
  <p class="note">Office roles with a typing test: ${office.map(esc).join(", ")}.</p>
</section>
${rolePages}
<section class="role" id="survey">
  <header><p class="kicker">Shared by every partner job</p><h2>Survey</h2>
  <p class="meta">25 questions · 25 min</p></header>
  <ol class="qs">${survey}</ol>
</section>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "load" });
if (process.env.PDF_HTML) writeFileSync(process.env.PDF_HTML, html);
const pdf = await page.pdf({
  format: "A4",
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate:
    '<div style="width:100%;font:8pt Arial;color:#8792A2;padding:0 15mm;display:flex;justify-content:space-between"><span>Wemuste · Partner job interviews</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
  margin: { top: "16mm", bottom: "18mm", left: "15mm", right: "15mm" },
});
await browser.close();
writeFileSync(OUT, pdf);
console.log(`${OUT} (${ROLES.length} roles)`);
