import { expect, test } from "@playwright/test";
import { login, signOut, unique } from "./helpers";
import { totp } from "./totp";

// Full marketplace journey across all three roles, using the local seed:
// admin@wemuste.local (admin) and worker@wemuste.local (finished profile).
test("admin creates employer → employer posts job → worker requests → employer accepts", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const employerEmail = `employer${unique()}@example.test`;
  const jobTitle = `Weekend barista ${unique()}`;

  // --- Admin: MFA enrollment, then create the employer account ---
  await login(page, "admin@wemuste.local");
  await expect(page).toHaveURL(/\/admin\/mfa$/);
  const secret = (await page.locator("code").first().textContent({ timeout: 15_000 }))!.trim();
  await page.getByLabel("6-digit code").fill(totp(secret));
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.getByRole("link", { name: "Employers" }).first().click();
  await page.getByRole("link", { name: "Create employer" }).click();
  await page.getByLabel("Company name").fill("Harbour Coffee LLC");
  await page.getByLabel("Contact person").fill("Omar Ali");
  await page.getByLabel("Phone number").fill("+971 50 123 4567");
  await page.getByLabel("Login email").fill(employerEmail);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Account created" })).toBeVisible();
  const tempPassword = (await page.getByTestId("temp-password").textContent())!.trim();
  expect(tempPassword).toMatch(/^[A-Za-z0-9]{4}(-[A-Za-z0-9]{4}){3}$/);
  await signOut(page);

  // --- Employer: first login forces a password change ---
  await login(page, employerEmail, tempPassword);
  await expect(page).toHaveURL(/\/employer\/welcome$/);
  await page.goto("/employer/jobs/new");
  await expect(page).toHaveURL(/\/employer\/welcome$/);
  const employerPassword = "Harbour-Coffee-Roast-88";
  await page.getByLabel("New password", { exact: true }).fill(employerPassword);
  await page.getByLabel("Confirm new password").fill(employerPassword);
  await page.getByRole("button", { name: "Save password and continue" }).click();
  await expect(page).toHaveURL(/\/employer$/);
  await expect(page.getByRole("heading", { name: "Post your first job" })).toBeVisible();

  // --- Employer: post a job, placing the pin on the map ---
  await page.getByRole("link", { name: "Post a job" }).first().click();
  await page.getByLabel("Job title").fill(jobTitle);
  await page.getByRole("button", { name: "Hospitality" }).click();
  await page.getByLabel("Description").fill("Make coffee and serve customers. Training provided.");
  await page.getByLabel("From").fill("30");
  await page.getByRole("button", { name: "Weekends" }).click();
  await page.getByLabel("Area").fill("Dubai Marina");
  await page.getByLabel("Exact address").fill("Marina Walk, Shop 7");
  const map = page.locator(".maplibregl-canvas");
  await expect(map).toBeVisible({ timeout: 15_000 });
  await map.click({ position: { x: 150, y: 120 } });
  await page.getByRole("button", { name: "Post job" }).click();
  await expect(page).toHaveURL(/\/employer\/jobs\/[0-9a-f-]+\?posted=1$/);
  await expect(page.getByText("Your job is live on the map.")).toBeVisible();
  const jobUrl = new URL(page.url()).pathname;
  await signOut(page);

  // --- Worker: find the job on the map and send a request ---
  await login(page, "worker@wemuste.local");
  await expect(page).toHaveURL(/\/employee$/);
  await page
    .getByRole("button", { name: new RegExp(jobTitle) })
    .first()
    .click();
  const sheet = page.getByRole("dialog", { name: jobTitle });
  await expect(
    sheet.getByText("The exact address is shared after the employer accepts your request."),
  ).toBeVisible();
  await expect(sheet.getByText("Marina Walk, Shop 7")).toHaveCount(0);
  await sheet.getByLabel("Message to the employer").fill("I have 3 years of barista experience.");
  await sheet.getByRole("button", { name: "Send request" }).click();
  await expect(sheet.getByText("Request sent").first()).toBeVisible();
  // The sheet covers the tab bar on phones.
  await sheet.getByRole("button", { name: "Close" }).click();
  await page.getByRole("link", { name: "Requests" }).click();
  await expect(page.getByText(jobTitle).first()).toBeVisible();
  await page.getByRole("link", { name: "Profile", exact: true }).click();
  await signOut(page);

  // --- Employer: limited profile before accepting, contact after ---
  await login(page, employerEmail, employerPassword);
  await expect(page).toHaveURL(/\/employer$/);
  await page.goto(jobUrl);
  await expect(page.getByText("Barista and cashier, 3 years experience")).toBeVisible();
  await expect(page.getByText("“I have 3 years of barista experience.”")).toBeVisible();
  await expect(page.getByText("Maria Santos")).toHaveCount(0);
  await expect(page.getByText("Name and contact details appear when you accept.")).toBeVisible();
  await page.getByRole("button", { name: "Accept" }).click();
  await expect(page.getByText("Maria Santos")).toBeVisible();
  await expect(page.getByRole("link", { name: "worker@wemuste.local" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Call" })).toBeVisible();
  await signOut(page);

  // --- Worker: exact address unlocked ---
  await login(page, "worker@wemuste.local");
  await expect(page).toHaveURL(/\/employee$/);
  await page
    .getByRole("button", { name: new RegExp(jobTitle) })
    .first()
    .click();
  const accepted = page.getByRole("dialog", { name: jobTitle });
  await expect(accepted.getByText("Marina Walk, Shop 7")).toBeVisible();
  await expect(accepted.getByRole("link", { name: "Open in Maps" })).toBeVisible();
});
