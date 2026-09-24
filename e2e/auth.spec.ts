import { expect, test, type Page } from "@playwright/test";
import { waitForAuthLink } from "./mailpit";

const PASSWORD = "Tulip-Harbor-Vessel-92";
const unique = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

async function activate(page: Page, email: string, since: Date) {
  const link = await waitForAuthLink(email, since);
  // Links use the email template's token_hash format, not the PKCE default.
  expect(link).toContain("token_hash=");
  // Emails use Supabase's site_url; open the same path on the app under test.
  const url = new URL(link);
  await page.goto(`${url.pathname}${url.search}`);
}

test("landing page offers both roles and sends security headers", async ({ page }) => {
  const response = await page.goto("/");
  const headers = response!.headers();
  expect(headers["content-security-policy"]).toMatch(
    /script-src 'self' 'nonce-[^']+' 'strict-dynamic'/,
  );
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["strict-transport-security"]).toContain("max-age=63072000");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["permissions-policy"]).toBe("camera=(self), microphone=(self), geolocation=()");
  expect(headers["x-powered-by"]).toBeUndefined();

  await expect(page.getByRole("link", { name: /I'm looking for work/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /I'm hiring/ })).toBeVisible();
});

test("protected areas redirect guests to login", async ({ page }) => {
  for (const path of ["/employee", "/employer", "/admin"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
});

test("employee: validation, signup, email activation, logout, login", async ({ page }) => {
  const email = `employee${unique()}@example.test`;

  await page.goto("/");
  await page.getByRole("link", { name: /I'm looking for work/ }).click();
  await expect(page).toHaveURL(/\/signup\/employee$/);

  // Inline validation, and consent is never pre-ticked.
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Please enter your full name.")).toBeVisible();
  await expect(
    page.getByText("Please accept the Terms and Privacy Policy to continue."),
  ).toBeVisible();
  await expect(page.getByRole("checkbox").first()).not.toBeChecked();

  await page.getByLabel("Full name").fill("Maria Santos");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByLabel("Password", { exact: true }).blur();
  await expect(page.getByText("Use at least 10 characters.")).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await expect(page.getByText(/Password strength: Strong/)).toBeVisible();
  await page.getByRole("checkbox", { name: /I agree to the/ }).check();
  await page.getByRole("checkbox", { name: /stored privately/ }).check();

  const since = new Date(Date.now() - 1000);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/verify-email$/);
  await expect(page.getByText(/We sent a link to e•+@example\.test/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Resend in \d+s/ })).toBeDisabled();

  // Unverified accounts cannot log in yet.
  const other = await page.context().browser()!.newPage();
  await other.goto("/login");
  await other.getByLabel("Email").fill(email);
  await other.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await other.getByRole("button", { name: "Log in" }).click();
  await expect(other.getByText(/Please activate your account first/)).toBeVisible();
  await other.close();

  await activate(page, email, since);
  await expect(page).toHaveURL(/\/employee$/);
  await expect(page.getByRole("heading", { name: "Hi Maria" })).toBeVisible();
  await expect(page.getByText("Not finished")).toBeVisible();

  // Employees cannot open employer or admin areas.
  await page.goto("/employer");
  await expect(page).toHaveURL(/\/employee$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/employee$/);
  // Signed-in users skip the login page.
  await page.goto("/login");
  await expect(page).toHaveURL(/\/employee$/);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Wrong-password-123");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Email or password is incorrect.")).toBeVisible();

  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/employee$/);
});

test("employer: signup lands on the pending review screen", async ({ page }) => {
  const email = `employer${unique()}@example.test`;
  await page.goto("/signup/employer");
  await page.getByLabel("Company name").fill("Acme Trading LLC");
  await page.getByLabel("Your name").fill("Omar Ali");
  await page.getByLabel("Phone number").fill("+971 50 123 4567");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("checkbox", { name: /I agree to the/ }).check();

  const since = new Date(Date.now() - 1000);
  await page.getByRole("button", { name: "Create employer account" }).click();
  await expect(page).toHaveURL(/\/verify-email$/);

  await activate(page, email, since);
  await expect(page).toHaveURL(/\/employer\/pending$/);
  await expect(page.getByRole("heading", { name: "Your account is under review" })).toBeVisible();
  await expect(page.getByText(/Thanks for signing up Acme Trading LLC/)).toBeVisible();

  // The candidates page stays closed while pending.
  await page.goto("/employer");
  await expect(page).toHaveURL(/\/employer\/pending$/);
});

test("password reset: email link, new password, signed out everywhere", async ({ page }) => {
  const email = `reset${unique()}@example.test`;
  await page.goto("/signup/employee");
  await page.getByLabel("Full name").fill("Reset Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("checkbox", { name: /I agree to the/ }).check();
  await page.getByRole("checkbox", { name: /stored privately/ }).check();
  let since = new Date(Date.now() - 1000);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/verify-email$/);
  await activate(page, email, since);
  await expect(page).toHaveURL(/\/employee$/);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  // Same neutral answer for known and unknown emails.
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(`nobody${unique()}@example.test`);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText(/If an account exists for that email/)).toBeVisible();

  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(email);
  since = new Date(Date.now() - 1000);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText(/If an account exists for that email/)).toBeVisible();

  await activate(page, email, since);
  await expect(page).toHaveURL(/\/reset-password$/);
  const newPassword = "Orchid-Lantern-Meadow-47";
  await page.getByLabel("New password", { exact: true }).fill(newPassword);
  await page.getByLabel("Confirm new password").fill(newPassword);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page).toHaveURL(/\/login\?reset=1$/);
  await expect(page.getByText("Your password was changed. Please log in again.")).toBeVisible();

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Email or password is incorrect.")).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/employee$/);
});
