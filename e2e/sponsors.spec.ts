import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./admin-session";
import { createUser, psql } from "./db";
import { acceptConfirms, answerAll, login, signOut, unique } from "./helpers";
import { waitForEmail } from "./mailpit";

// A tiny valid PNG (1x1), for the logo upload.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test("admin creates a sponsor with a password, emails it, changes it, suspends and deletes the sponsor", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await acceptConfirms(page);
  const email = `sponsor${unique()}@example.test`;
  const company = `Harbour Coffee ${unique()}`;
  const password = "Harbour-Coffee-Roast-88";

  // --- Admin (MFA) creates the sponsor and chooses the password ---
  await loginAsAdmin(page);
  const nav = page.getByRole("navigation", { name: "Admin" });
  await nav.getByRole("link", { name: "Sponsors", exact: true }).click();
  await page.getByRole("link", { name: "Create sponsor" }).click();
  await page.getByLabel("Company name").fill(company);
  await page.getByLabel("Contact person").fill("Omar Ali");
  await page.getByLabel("Phone number").fill("+971 50 123 4567");
  await page.getByLabel("Login email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("short");
  const createdAt = new Date(Date.now() - 1000);
  await page.getByRole("button", { name: "Create sponsor" }).click();
  await expect(page.getByText("Use at least 10 characters.")).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create sponsor" }).click();
  await expect(page.getByRole("heading", { name: "Sponsor created" })).toBeVisible();
  await expect(page.getByText(`We emailed the login details to ${email}.`)).toBeVisible();

  // The email has the login details and a link to log in.
  const welcome = await waitForEmail(email, /Your Wemuste sponsor account/, createdAt);
  expect(welcome.text).toContain(password);
  expect(welcome.html).toContain("/login");

  // The same email can't be used twice.
  await page.getByRole("button", { name: "Create another" }).click();
  await page.getByLabel("Company name").fill("Duplicate LLC");
  await page.getByLabel("Contact person").fill("Omar Ali");
  await page.getByLabel("Phone number").fill("+971 50 123 4567");
  await page.getByLabel("Login email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Another-Password-123");
  await page.getByRole("button", { name: "Create sponsor" }).click();
  await expect(page.getByText("An account with this email already exists.").first()).toBeVisible();

  // --- Admin opens the sponsor: logo and a new password (emailed) ---
  await nav.getByRole("link", { name: "Sponsors", exact: true }).click();
  await page.getByRole("link", { name: new RegExp(company) }).click();
  await expect(page.getByRole("heading", { name: company })).toBeVisible();
  await expect(page.getByText("Active")).toBeVisible();
  await page
    .getByLabel("Upload logo")
    .setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByText("Logo saved.")).toBeVisible();
  await expect(page.locator('img[src*="/sponsor-logos/"]')).toBeVisible();
  const newPassword = "Orchid-Lantern-Meadow-47";
  const changedAt = new Date(Date.now() - 1000);
  await page.getByLabel("New password", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "Set password" }).click();
  await expect(page.getByText("Password changed and emailed to the sponsor.")).toBeVisible();
  const changed = await waitForEmail(email, /Your new Wemuste password/, changedAt);
  expect(changed.text).toContain(newPassword);
  expect(
    psql(`select string_agg(a.action, ',' order by a.created_at) from public.audit_logs a join auth.users u on u.id = a.target_id
          where u.email = '${email}' and a.action like 'sponsor.%'`),
  ).toBe("sponsor.logo,sponsor.password");
  await signOut(page);

  // --- The sponsor logs in with the new password (the old one no longer works) ---
  await login(page, email, password);
  await expect(page.getByText("Email or password is incorrect.")).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/sponsor$/);
  await expect(page.getByRole("heading", { name: "Post your first job" })).toBeVisible();
  // The sponsor can change their own logo too.
  await page
    .getByRole("navigation", { name: "Sponsor" })
    .getByRole("link", { name: "Account" })
    .click();
  await page
    .getByLabel("Change logo")
    .setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByText("Logo saved.")).toBeVisible();
  // A file that isn't really an image is refused.
  await page.getByLabel("Change logo").setInputFiles({
    name: "fake.png",
    mimeType: "image/png",
    buffer: Buffer.from("<svg onload=alert(1)>"),
  });
  await expect(page.getByText(/That file didn't work/)).toBeVisible();
  await signOut(page);

  // --- Admin suspends: the sponsor only sees the paused screen ---
  await loginAsAdmin(page);
  await page.goto("/admin/sponsors");
  await page.getByRole("link", { name: new RegExp(company) }).click();
  await page.getByRole("button", { name: "Suspend" }).click();
  await expect(page.getByText("Suspended", { exact: true }).first()).toBeVisible();
  await signOut(page);
  await login(page, email, newPassword);
  await expect(page).toHaveURL(/\/sponsor\/pending$/);
  await expect(page.getByRole("heading", { name: "Your account is paused" })).toBeVisible();
  await signOut(page);

  // --- Admin deletes the sponsor (type the company name to confirm) ---
  await loginAsAdmin(page);
  await page.goto("/admin/sponsors");
  await page.getByRole("link", { name: new RegExp(company) }).click();
  const remove = page.getByRole("button", { name: "Delete sponsor" });
  await expect(remove).toBeDisabled();
  await page.getByLabel(`Type "${company}" to confirm`).fill(company);
  await remove.click();
  await expect(page).toHaveURL(/\/admin\/sponsors\?deleted=1$/);
  await expect(page.getByText("The sponsor was deleted.")).toBeVisible();
  expect(psql(`select count(*) from auth.users where email = '${email}'`)).toBe("0");
  expect(psql(`select count(*) from public.audit_logs where action = 'sponsor.deleted'`)).not.toBe(
    "0",
  );
});

test("a sponsor deletes their account", async ({ page }) => {
  const email = `delete${unique()}@example.test`;
  const password = "Delete-Me-Please-2026";
  const id = createUser(
    email,
    password,
    {},
    { wemuste_role: "employer", company_name: "Delete Me LLC" },
  );
  psql(
    `update public.employer_profiles set status = 'approved', must_change_password = false where user_id = '${id}'`,
  );
  await login(page, email, password);
  await expect(page).toHaveURL(/\/sponsor$/);
  await page
    .getByRole("navigation", { name: "Sponsor" })
    .getByRole("link", { name: "Account" })
    .click();
  await page.getByRole("button", { name: "Delete my account" }).click();
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await page.getByRole("button", { name: "Delete forever" }).click();
  await expect(page).toHaveURL(/\/login\?deleted=1$/);
  expect(psql(`select count(*) from auth.users where id = '${id}'`)).toBe("0");
  expect(
    psql(
      `select metadata::text from public.audit_logs where action = 'account.deleted' and target_id = '${id}'`,
    ),
  ).toBe('{"role": "employer"}');
  await login(page, email, password);
  await expect(page.getByText("Email or password is incorrect.")).toBeVisible();
});
