import { expect, test } from "@playwright/test";
import { activate, login, signOut, unique } from "./helpers";

const PASSWORD = "Tulip-Harbor-Vessel-92";

test("landing page is the map and sends security headers", async ({ page }) => {
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

  await expect(
    page.getByRole("heading", { name: "Side jobs near you, on the map." }),
  ).toBeVisible();
  await page.getByRole("link", { name: /I'm hiring/ }).click();
  await expect(page).toHaveURL(/\/for-employers$/);
  await expect(page.getByRole("heading", { name: "Hiring with Wemuste" })).toBeVisible();
});

test("employers cannot sign up publicly", async ({ page }) => {
  const response = await page.goto("/signup/employer");
  expect(response!.status()).toBe(404);
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
  await page.getByRole("link", { name: /Find work near me/ }).click();
  await expect(page).toHaveURL(/\/signup\/employee$/);

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

  const other = await page.context().browser()!.newPage();
  await login(other, email, PASSWORD);
  await expect(other.getByText(/Please activate your account first/)).toBeVisible();
  await other.close();

  await activate(page, email, since);
  await expect(page).toHaveURL(/\/employee$/);
  await expect(page.getByRole("link", { name: "Map" })).toHaveAttribute("aria-current", "page");

  await page.getByRole("link", { name: "Profile" }).click();
  await expect(page.getByRole("heading", { name: "Hi Maria" })).toBeVisible();
  await expect(page.getByText("Not finished")).toBeVisible();

  await page.goto("/employer");
  await expect(page).toHaveURL(/\/employee$/);
  await page.goto("/login");
  await expect(page).toHaveURL(/\/employee$/);

  await page.goto("/employee/profile");
  await signOut(page);
  await login(page, email, "Wrong-password-123");
  await expect(page.getByText("Email or password is incorrect.")).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/employee$/);
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
  await page.goto("/employee/profile");
  await signOut(page);

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

  await login(page, email, PASSWORD);
  await expect(page.getByText("Email or password is incorrect.")).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/employee$/);
});
