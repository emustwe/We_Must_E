import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./admin-session";
import { createUser, psql } from "./db";
import { activate, login, signOut, unique } from "./helpers";
import { waitForEmail } from "./mailpit";

test("admin invites an employer, who sets a password, logs in, resets it, and can be suspended", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const email = `invite${unique()}@example.test`;
  const company = `Harbour Coffee ${unique()}`;

  // --- Admin (MFA) sends the invite ---
  await loginAsAdmin(page);
  const nav = page.getByRole("navigation", { name: "Admin" });
  await nav.getByRole("link", { name: "Employers", exact: true }).click();
  await page.getByRole("link", { name: "Create employer" }).click();
  await page.getByLabel("Company name").fill(company);
  await page.getByLabel("Contact person").fill("Omar Ali");
  await page.getByLabel("Phone number").fill("+971 50 123 4567");
  await page.getByLabel("Login email").fill(email);
  const invitedAt = new Date(Date.now() - 1000);
  await page.getByRole("button", { name: "Send invite" }).click();
  await expect(page.getByRole("heading", { name: "Invite sent" })).toBeVisible();

  // The same email can't be invited twice.
  await page.getByRole("button", { name: "Create another" }).click();
  await page.getByLabel("Company name").fill("Duplicate LLC");
  await page.getByLabel("Contact person").fill("Omar Ali");
  await page.getByLabel("Phone number").fill("+971 50 123 4567");
  await page.getByLabel("Login email").fill(email);
  await page.getByRole("button", { name: "Send invite" }).click();
  await expect(page.getByText("An account with this email already exists.").first()).toBeVisible();

  // Listed as approved, invite not accepted yet; resend works.
  await nav.getByRole("link", { name: "Employers", exact: true }).click();
  const row = page.getByRole("listitem").filter({ hasText: company });
  await expect(row.getByText("Active")).toBeVisible();
  await expect(row.getByText("Invite not accepted yet")).toBeVisible();
  await row.getByRole("button", { name: "Resend invite" }).click();
  await expect(page.getByText("Invite sent again.")).toBeVisible();
  expect(
    psql(`select count(*) from public.audit_logs a join auth.users u on u.id = a.target_id
                where u.email = '${email}' and a.action = 'employer.status_changed'`),
  ).toBe("1");
  await signOut(page);

  // --- Employer opens the invite and chooses a password ---
  const invite = await waitForEmail(email, /invited to Wemuste/, invitedAt);
  expect(invite.html).not.toContain(company);
  await activate(page, email, invitedAt);
  await expect(page).toHaveURL(/\/employer\/welcome$/);
  const password = "Harbour-Coffee-Roast-88";
  await page.getByLabel("New password", { exact: true }).fill(password);
  await page.getByLabel("Confirm new password").fill(password);
  await page.getByRole("button", { name: "Save password and continue" }).click();
  await expect(page).toHaveURL(/\/employer$/);
  await expect(page.getByRole("heading", { name: "Post your first job" })).toBeVisible();
  await signOut(page);

  // --- Log in with the new password; wrong password is generic ---
  await login(page, email, "Wrong-password-123");
  await expect(page.getByText("Email or password is incorrect.")).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/employer$/);
  await signOut(page);

  // --- Forgot password: same neutral answer, link works, signs out everywhere ---
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(email);
  const resetAt = new Date(Date.now() - 1000);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText(/If an account exists for that email/)).toBeVisible();
  await activate(page, email, resetAt);
  await expect(page).toHaveURL(/\/reset-password$/);
  const newPassword = "Orchid-Lantern-Meadow-47";
  await page.getByLabel("New password", { exact: true }).fill(newPassword);
  await page.getByLabel("Confirm new password").fill(newPassword);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page).toHaveURL(/\/login\?reset=1$/);
  await login(page, email, newPassword);
  await expect(page).toHaveURL(/\/employer$/);
  await signOut(page);

  // --- Admin suspends: the employer only sees the paused screen ---
  await loginAsAdmin(page);
  await page
    .getByRole("navigation", { name: "Admin" })
    .getByRole("link", { name: "Employers", exact: true })
    .click();
  await page
    .getByRole("listitem")
    .filter({ hasText: company })
    .getByRole("button", { name: "Suspend" })
    .click();
  await expect(
    page.getByRole("listitem").filter({ hasText: company }).getByText("Suspended"),
  ).toBeVisible();
  await signOut(page);
  await login(page, email, newPassword);
  await expect(page).toHaveURL(/\/employer\/pending$/);
  await expect(page.getByRole("heading", { name: "Your account is paused" })).toBeVisible();
});

test("an employer deletes their account", async ({ page }) => {
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
  await expect(page).toHaveURL(/\/employer$/);
  await page
    .getByRole("navigation", { name: "Employer" })
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
