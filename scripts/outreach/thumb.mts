// Renders the outreach email picture (public/email/video.jpg) from thumb.html.
// Run: npx tsx scripts/outreach/thumb.mts
// When the real video is ready, replace the file with a frame of it instead
// (same name, 1120x630): emails already sent show the new picture too.
import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1120, height: 630 } });
await page.goto(`file://${here("./thumb.html")}`);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);
await page.screenshot({ path: here("../../public/email/video.jpg"), type: "jpeg", quality: 86 });
await browser.close();
console.log("public/email/video.jpg updated");
