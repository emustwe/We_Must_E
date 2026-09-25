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
}

// Confirmations are an in-page popup (<dialog>), not the browser's confirm():
// press its confirm button whenever one opens, like accepting a native dialog.
export async function acceptConfirms(page: Page) {
  await page.addLocatorHandler(page.getByRole("dialog"), async (dialog) => {
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
