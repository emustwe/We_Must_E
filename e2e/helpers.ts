import { expect, type Page } from "@playwright/test";
import { psql } from "./db";
import { waitForAuthLink } from "./mailpit";

export const SEED_PASSWORD = "Wemuste-Local-2026!";
export const unique = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

export async function login(page: Page, email: string, password = SEED_PASSWORD) {
  // The whole suite logs in more often than the real per-IP login limit allows.
  psql("truncate private.rate_limits");
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

export async function signOut(page: Page) {
  // The admin sidebar (with Sign out) is a drawer on phones.
  const menu = page.getByRole("button", { name: "Open menu" });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("button", { name: "Sign out" }).first().click();
  await expect(page).toHaveURL(/\/login$/);
}

export async function activate(page: Page, email: string, since: Date) {
  const link = await waitForAuthLink(email, since);
  // Links use our email templates' token_hash format, not the PKCE default.
  expect(link).toContain("token_hash=");
  // Emails use Supabase's site_url; open the same path on the app under test.
  const url = new URL(link);
  await page.goto(`${url.pathname}${url.search}`);
  // The link is used only when Continue is pressed.
  await page.getByRole("button", { name: "Continue" }).click();
}

// Confirmations are an in-page popup (<dialog>), not the browser's confirm():
// press its confirm button whenever one opens, like accepting a native dialog.
export async function acceptConfirms(page: Page) {
  await page.addLocatorHandler(page.locator("dialog[open]"), async (dialog) => {
    await dialog.getByRole("button").last().click();
  });
}

// Answers every question on a one-page step: first option, or some text/number.
export async function answerAll(page: Page) {
  const cards = page.locator("main ol > li");
  for (let i = 0; i < (await cards.count()); i++) {
    const card = cards.nth(i);
    const choice = card.locator(
      'label:has(input[type="radio"]), label:has(input[type="checkbox"])',
    );
    if (await choice.count()) await choice.first().click();
    else if (await card.locator('input[type="number"]').count())
      await card.locator('input[type="number"]').fill("3");
    else if (await card.locator("textarea").count())
      await card.locator("textarea").fill("Happy to help.");
  }
}

// A 2-second WebM made in the browser, used as a video "picked from the phone".
export async function makeVideoFile(page: Page) {
  const base64 = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext("2d")!;
    const rec = new MediaRecorder(canvas.captureStream(15), { mimeType: "video/webm" });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    let hue = 0;
    const timer = setInterval(() => {
      ctx.fillStyle = `hsl(${(hue += 12) % 360} 70% 50%)`;
      ctx.fillRect(0, 0, 320, 240);
    }, 60);
    rec.start(200);
    await new Promise((r) => setTimeout(r, 2000));
    await new Promise((r) => {
      rec.onstop = r;
      rec.stop();
    });
    clearInterval(timer);
    const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer());
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary);
  });
  return { name: "answer.webm", mimeType: "video/webm", buffer: Buffer.from(base64, "base64") };
}
