import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./admin-session";
import { psql } from "./db";
import { signOut, unique } from "./helpers";

// Salespeople: an admin makes a referral code; a company that asks to become
// a sponsor with it is counted for that salesperson.
test("an admin creates a referral code; a company uses the salesperson's link", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const code = `ALI${String(unique()).slice(-6)}`;
  const company = `Referred Cafe ${unique()}`;
  try {
    await loginAsAdmin(page);
    await page.goto("/admin/sales");
    await expect(page.getByRole("heading", { name: "Sales" })).toBeVisible();
    await page.getByLabel("Referral code").fill(code.toLowerCase());
    await page.getByLabel("Nickname").fill("Ali (Lahore)");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByRole("heading", { name: "Ali (Lahore)" })).toBeVisible();
    await expect(page.getByText(code, { exact: true })).toBeVisible(); // kept in capitals
    await expect(page.getByText(`/for-sponsors?ref=${code}`, { exact: false })).toBeVisible();
    // The same code twice is refused.
    await page.goto("/admin/sales");
    await page.getByLabel("Referral code").fill(code);
    await page.getByLabel("Nickname").fill("Someone else");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(
      page.getByText("This referral code is already used.", { exact: false }),
    ).toBeVisible();
    await signOut(page);

    // The company opens the salesperson's link: the code is filled in.
    await page.goto(`/for-sponsors?ref=${code}`);
    await expect(page.getByLabel(/Referral code/)).toHaveValue(code);
    await page.getByLabel("Company name").fill(company);
    await page.getByLabel("Your name").fill("Lina Karim");
    await page.getByLabel("Work email").fill(`lina-${unique()}@example.test`);
    await page.getByLabel("Phone number").fill("+971 50 123 4567");
    await page.getByLabel("City").fill("Dubai");
    // A code that doesn't exist is refused (so it can be fixed).
    await page.getByLabel(/Referral code/).fill("NOPE123");
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(
      page.getByText("This referral code doesn't exist.", { exact: false }),
    ).toBeVisible();
    await page.getByLabel(/Referral code/).fill(code);
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByRole("heading", { name: "Request sent" })).toBeVisible();

    // The request shows the referral, and the salesperson counts the company.
    await loginAsAdmin(page);
    await page.goto("/admin/sponsor-requests");
    await expect(
      page
        .getByRole("listitem")
        .filter({ hasText: company })
        .getByText(`Referral: ${code}`, { exact: false }),
    ).toBeVisible();
    await page.goto("/admin/sales");
    await page.getByRole("link", { name: new RegExp(code) }).click();
    await expect(page.getByText("1 sponsor used this code")).toBeVisible();
    await expect(page.getByText(company)).toBeVisible();
  } finally {
    psql(`delete from public.sponsor_requests where company_name = '${company}'`);
    psql(`delete from public.sales_people where code = '${code}'`);
  }
});
