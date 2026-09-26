import { expect, test } from "@playwright/test";
import { createUser, psql } from "./db";
import { login, SEED_PASSWORD, unique } from "./helpers";
import { waitForAuthLink } from "./mailpit";

test("the public map page sends security headers", async ({ page }) => {
  const response = await page.goto("/");
  const headers = response!.headers();
  expect(headers["content-security-policy"]).toMatch(
    /script-src 'self' 'nonce-[^']+' 'strict-dynamic'/,
  );
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["strict-transport-security"]).toContain("max-age=63072000");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-powered-by"]).toBeUndefined();
  // Map tiles and place search come only from MapTiler; location only for this site.
  expect(headers["content-security-policy"]).toMatch(
    /connect-src [^;]*https:\/\/api\.maptiler\.com/,
  );
  expect(headers["permissions-policy"]).toContain("geolocation=(self)");
  // Phones: "Sponsor login" is in the filters panel.
  const filters = page.getByRole("button", { name: "Filters" });
  if (await filters.isVisible()) await filters.click();
  await page.getByRole("link", { name: "Sponsor login" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("job seekers no longer have accounts", async ({ page }) => {
  for (const path of ["/signup/employee", "/verify-email", "/employee", "/employee/onboarding"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  }
  await page.goto("/login");
  await expect(page.getByRole("link", { name: "How sponsors join" })).toHaveAttribute(
    "href",
    "/for-sponsors",
  );
});

test("protected areas redirect guests to login", async ({ page }) => {
  for (const path of ["/sponsor", "/admin"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
});

test("nobody can sign up through the Supabase API directly", async ({ request }) => {
  const env = Object.fromEntries(
    (await import("node:fs"))
      .readFileSync(".env.local", "utf8")
      .split("\n")
      .filter((l) => l.includes("="))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
  );
  const res = await request.post(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/signup`, {
    headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    data: { email: `api-signup-${Date.now()}@example.test`, password: "Some-Strong-Pass-99" },
  });
  expect(res.status()).toBe(422);
  expect((await res.json()).error_code).toBe("signup_disabled");
});

test("a logged-in account with no home page can still open the login page", async ({ page }) => {
  // e.g. an admin whose role was removed: the login page must not redirect to itself.
  const email = `no-home-${unique()}@example.test`;
  createUser(email, SEED_PASSWORD, {});
  try {
    await login(page, email);
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
  } finally {
    psql(`delete from auth.users where email = '${email}'`);
  }
});

test("an emailed reset link does nothing until Continue is pressed, and works once", async ({
  page,
}) => {
  const email = `reset-${unique()}@example.test`;
  createUser(email, SEED_PASSWORD, {}, { wemuste_role: "employer", company_name: "Reset Co" });
  try {
    const since = new Date();
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText("Check your email")).toBeVisible();
    const link = new URL(await waitForAuthLink(email, since));
    const path = `${link.pathname}${link.search}`;

    // Opening the link only shows a page (a scanner or a link from someone
    // else can't use it); pressing Continue signs in for the reset.
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "Choose a new password" })).toHaveCount(0);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();
    await page.getByLabel("New password", { exact: true }).fill("Quiet-River-Stone-4821");
    await page.getByLabel("Confirm new password").fill("Quiet-River-Stone-4821");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page).toHaveURL(/\/login\?reset=1$/);

    // The link works once.
    await page.context().clearCookies();
    await page.goto(path);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/login\?link=invalid$/);
  } finally {
    psql(`delete from auth.users where email = '${email}'`);
  }
});
