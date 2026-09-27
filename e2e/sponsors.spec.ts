import { expect, test, type Page } from "@playwright/test";
import { loginAsAdmin } from "./admin-session";
import { createUser, psql } from "./db";
import { acceptConfirms, answerAll, login, signOut, unique } from "./helpers";
import { waitForAuthLink, waitForEmail } from "./mailpit";

// A tiny valid PNG (1x1), for the logo upload.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test("admin creates a sponsor who chooses their own password; block, suspend, resend and delete", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await acceptConfirms(page);
  const email = `sponsor${unique()}@example.test`;
  const company = `Harbour Coffee ${unique()}`;
  const password = "Harbour-Coffee-Roast-88";

  // --- Admin (MFA) creates the sponsor: no password, an invite link instead ---
  await loginAsAdmin(page);
  // Phones: the admin sidebar is a drawer behind the menu button.
  await page.getByRole("button", { name: "Open menu" }).click();
  const nav = page.getByRole("navigation", { name: "Admin" });
  await nav.getByRole("link", { name: "Sponsors", exact: true }).click();
  await page.getByRole("link", { name: "Create sponsor" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveCount(0);
  await page.getByLabel("Company name").fill(company);
  await page.getByLabel("Contact person").fill("Omar Ali");
  await page.getByLabel("Phone number").fill("+971 50 123 4567");
  await page.getByLabel("Login email").fill(email);
  const createdAt = new Date(Date.now() - 1000);
  await page.getByRole("button", { name: "Create sponsor" }).click();
  await expect(page.getByRole("heading", { name: "Sponsor created" })).toBeVisible();
  await expect(
    page.getByText(`We emailed ${email} a link to choose their password.`, { exact: false }),
  ).toBeVisible();
  const invite = await waitForEmail(email, /Set up your Wemuste sponsor account/, createdAt);
  expect(invite.html).toContain("/auth/confirm");
  expect(invite.text).not.toMatch(/password:/i); // no password in the email

  // The same email can't be used twice.
  await page.getByRole("button", { name: "Create another" }).click();
  await page.getByLabel("Company name").fill("Duplicate LLC");
  await page.getByLabel("Contact person").fill("Omar Ali");
  await page.getByLabel("Phone number").fill("+971 50 123 4567");
  await page.getByLabel("Login email").fill(email);
  await page.getByRole("button", { name: "Create sponsor" }).click();
  await expect(page.getByText("An account with this email already exists.").first()).toBeVisible();

  // --- Admin adds a logo ---
  await page.getByRole("button", { name: "Open menu" }).click();
  await nav.getByRole("link", { name: "Sponsors", exact: true }).click();
  await page.getByRole("link", { name: new RegExp(company) }).click();
  await expect(page.getByRole("heading", { name: company })).toBeVisible();
  await page
    .getByLabel("Upload logo")
    .setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByText("Logo saved.")).toBeVisible();
  await expect(page.locator('img[src*="/sponsor-logos/"]')).toBeVisible();
  await signOut(page);

  // --- The sponsor opens the link, presses Continue and chooses a password ---
  const link = new URL(await waitForAuthLink(email, createdAt));
  await page.goto(`${link.pathname}${link.search}`);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Choose your password" })).toBeVisible();
  await page.getByLabel("New password", { exact: true }).fill(password);
  await page.getByLabel("Confirm new password").fill(password);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page).toHaveURL(/\/login\?reset=1$/);
  await login(page, email, password);
  await expect(page).toHaveURL(/\/sponsor$/);
  await expect(page.getByRole("heading", { name: "Post your first job" })).toBeVisible();
  // The sponsor can change their own logo too.
  await openSponsorMenu(page);
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

  // --- Admin blocks the login for a day: the sponsor can't log in; then unblocks ---
  await loginAsAdmin(page);
  await page.goto("/admin/sponsors");
  await page.getByRole("link", { name: new RegExp(company) }).click();
  await page.getByLabel("Block for").selectOption("1d");
  await page.getByRole("button", { name: "Block", exact: true }).click();
  await expect(page.getByText(/Blocked until/)).toBeVisible();
  await signOut(page);
  await login(page, email, password);
  await expect(page.getByText("Your account is blocked for now.", { exact: false })).toBeVisible();
  await loginAsAdmin(page);
  await page.goto("/admin/sponsors");
  await page.getByRole("link", { name: new RegExp(company) }).click();
  await page.getByRole("button", { name: "Unblock" }).click();
  await expect(page.getByText("The sponsor can log in again.")).toBeVisible();
  await signOut(page);
  await login(page, email, password);
  await expect(page).toHaveURL(/\/sponsor$/);
  await signOut(page);

  // --- Admin suspends: the sponsor only sees the paused screen ---
  await loginAsAdmin(page);
  await page.goto("/admin/sponsors");
  await page.getByRole("link", { name: new RegExp(company) }).click();
  await page.getByRole("button", { name: "Suspend" }).click();
  await expect(page.getByText("Suspended", { exact: true }).first()).toBeVisible();
  await signOut(page);
  await login(page, email, password);
  await expect(page).toHaveURL(/\/sponsor\/pending$/);
  await expect(page.getByRole("heading", { name: "Your account is paused" })).toBeVisible();
  await signOut(page);

  // --- "Resend invite" emails a new link to choose a password ---
  await loginAsAdmin(page);
  await page.goto("/admin/sponsors");
  const resentAt = new Date(Date.now() - 1000);
  await page.getByRole("button", { name: `Actions for ${company}` }).click();
  await page.getByRole("menuitem", { name: "Resend invite" }).click();
  await expect(page.getByText("A new link to choose their password was emailed.")).toBeVisible();
  const resent = await waitForEmail(email, /Set up your Wemuste sponsor account/, resentAt);
  expect(resent.html).toContain("/auth/confirm");
  expect(
    psql(`select string_agg(distinct a.action, ',' order by a.action) from public.audit_logs a
          where a.target_id = (select id from auth.users where email = '${email}') and a.action like 'sponsor.%'`),
  ).toBe("sponsor.blocked,sponsor.invite,sponsor.logo,sponsor.unblocked");

  // --- Admin deletes the sponsor (type the company name to confirm) ---
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
  await openSponsorMenu(page);
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

// The sponsor sidebar is a drawer on phones.
async function openSponsorMenu(page: Page) {
  const menu = page.getByRole("button", { name: "Open menu" });
  if (await menu.isVisible()) await menu.click();
}

test("a company asks to become a sponsor; the admin creates the account from the request", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const company = `Harbour Coffee ${unique()}`;
  const started = new Date();
  // On a phone the "For sponsors" choices are in the map's Filters panel.
  await page.goto("/");
  await page.getByRole("button", { name: "Filters" }).click();
  await expect(page.getByRole("link", { name: /Sponsor login/ })).toBeVisible();
  await page.getByRole("link", { name: /Become a sponsor/ }).click();
  await expect(page).toHaveURL(/\/for-sponsors$/);

  await page.getByLabel("Company name").fill(company);
  await page.getByLabel("Your name").fill("Lina Karim");
  await page.getByLabel("Work email").fill(`lina-${unique()}@example.test`);
  await page.getByLabel("Phone number").fill("+971 50 123 4567");
  await page.getByLabel("City").fill("Dubai");
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByRole("heading", { name: "Request sent" })).toBeVisible();
  await waitForEmail("admin@wemuste.local", /New request to become a sponsor/, started);

  await loginAsAdmin(page);
  await page.goto("/admin/sponsor-requests");
  const card = page.getByRole("listitem").filter({ hasText: company });
  await expect(card).toContainText("Lina Karim");
  await card.getByRole("link", { name: "Create sponsor account" }).click();
  await expect(page.getByLabel("Company name")).toHaveValue(company);
  await expect(page.getByLabel("Contact person")).toHaveValue("Lina Karim");
  psql(`delete from public.sponsor_requests where company_name = '${company}'`);
});
