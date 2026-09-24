import { expect, type Page } from "@playwright/test";
import { waitForAuthLink } from "./mailpit";

export const SEED_PASSWORD = "Wemuste-Local-2026!";
export const unique = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

export async function login(page: Page, email: string, password = SEED_PASSWORD) {
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
