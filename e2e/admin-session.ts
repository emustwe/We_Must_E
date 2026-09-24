import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, type Page } from "@playwright/test";
import { login } from "./helpers";
import { totp } from "./totp";

// The seeded admin enrolls TOTP once per run (global setup clears factors);
// later specs reuse the secret to pass the MFA challenge.
export const SECRET_FILE = join(tmpdir(), "wemuste-e2e-admin-totp");

export async function loginAsAdmin(page: Page) {
  await login(page, "admin@wemuste.local");
  await expect(page).toHaveURL(/\/admin\/mfa$/);
  await expect(page.getByLabel("6-digit code")).toBeVisible();
  // Either the enrollment secret appears, or the challenge prompt for an enrolled admin.
  const code = page.locator("code").first();
  await expect(
    code.or(page.getByText("Enter the 6-digit code from your authenticator app.")),
  ).toBeVisible({ timeout: 15_000 });
  const enrolling = await code.isVisible();
  let secret: string;
  if (enrolling) {
    secret = (await page.locator("code").first().textContent())!.trim();
    writeFileSync(SECRET_FILE, secret);
  } else {
    if (!existsSync(SECRET_FILE))
      throw new Error("Admin already enrolled but no saved TOTP secret");
    secret = readFileSync(SECRET_FILE, "utf8").trim();
  }
  await page.getByLabel("6-digit code").fill(totp(secret));
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}
