import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./admin-session";
import { psql } from "./db";
import { signOut, unique } from "./helpers";

// Outreach: an admin adds companies, copies one's email (with its private
// video link) and marks it sent; the company opens its link, asks to become
// a sponsor with its details filled in; another one unsubscribes.
test("an admin emails companies a private video link; one signs up, one unsubscribes", async ({
  page,
  context,
}) => {
  test.setTimeout(150_000);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const id = unique();
  const a = { name: "Sara Khan", company: `Khan Traders ${id}`, email: `sara-${id}@outreach.test` };
  const b = { name: "Omar Ali", company: `Ali Builders ${id}`, email: `omar-${id}@outreach.test` };
  const token = (email: string) =>
    psql(`select token from public.outreach_contacts where email = '${email}'`);
  const status = (email: string) =>
    psql(`select status || '|' || open_count from public.outreach_contacts where email = '${email}'`);
  try {
    await loginAsAdmin(page);
    await page.goto("/admin/outreach");
    await expect(page.getByRole("heading", { name: "Outreach", level: 1 })).toBeVisible();
    const paste = page.getByLabel(/One company per line/);
    await paste.fill(
      [
        `${a.name}, ${a.company}, ${a.email.toUpperCase()}, Pakistan`,
        "Nobody, No email here",
        `${b.name}; ${b.company}; ${b.email}; UAE`,
      ].join("\n"),
    );
    await expect(page.getByText("2 contacts ready.")).toBeVisible();
    await expect(page.getByText(/Line 2 can't be read/)).toBeVisible();
    await page.getByRole("button", { name: "Add 2 contacts" }).click();
    await expect(page.getByText("Added 2.")).toBeVisible();
    const rowA = page.locator(`[data-contact="${a.email}"]`);
    await expect(rowA).toContainText(a.company);
    await expect(rowA).toContainText("Not sent");
    // The same emails again are skipped.
    await paste.fill(`${a.name}, ${a.company}, ${a.email}`);
    await page.getByRole("button", { name: "Add 1 contact" }).click();
    await expect(page.getByText("1 was already in the list.")).toBeVisible();

    // Copy the email: the designed version carries the private link.
    await rowA.getByRole("button", { name: "Copy email" }).click();
    await expect(page.getByText("Email copied.", { exact: false })).toBeVisible();
    const html = await page.evaluate(async () => {
      const [item] = await navigator.clipboard.read();
      return (await item.getType("text/html")).text();
    });
    const tokenA = token(a.email);
    expect(html).toContain(`/w/${tokenA}`);
    expect(html).toContain("/email/video.jpg");
    expect(html).toContain("Hi Sara,");
    await rowA.getByRole("button", { name: "Mark as sent" }).click();
    await expect(rowA).toContainText("Sent");
    // An admin opening the link isn't counted.
    await page.goto(`/w/${tokenA}`);
    await expect(page.getByRole("heading", { name: `A short video for ${a.company}` })).toBeVisible();
    await page.waitForTimeout(1500);
    expect(status(a.email)).toBe("sent|0");
    await page.goto("/admin/outreach");
    await signOut(page);

    // The company opens its link: counted, and "Become a sponsor" is filled in.
    await page.goto(`/w/${tokenA}`);
    await expect(page.getByText("Hi Sara,")).toBeVisible();
    await expect(page.getByText("Video coming soon")).toBeVisible();
    await expect.poll(() => status(a.email)).toBe("opened|1");
    await page.getByRole("link", { name: "Become a sponsor" }).click();
    await expect(page.getByLabel("Company name")).toHaveValue(a.company);
    await expect(page.getByLabel("Your name")).toHaveValue(a.name);
    await expect(page.getByLabel("Work email")).toHaveValue(a.email);
    await page.getByLabel("Phone number").fill("+92 300 1234567");
    await page.getByLabel("City").fill("Lahore");
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByRole("heading", { name: "Request sent" })).toBeVisible();
    expect(status(a.email)).toBe("signed_up|1");

    // The other one unsubscribes: their link stops working.
    const tokenB = token(b.email);
    await page.goto(`/w/${tokenB}/unsubscribe`);
    await page.getByRole("button", { name: "Don't email me again" }).click();
    await expect(page.getByText("We won't email you again.", { exact: false })).toBeVisible();
    expect(status(b.email)).toBe("unsubscribed|0");
    expect((await page.goto(`/w/${tokenB}`))?.status()).toBe(404);
    // A made-up link doesn't exist.
    expect((await page.goto(`/w/${"0".repeat(32)}`))?.status()).toBe(404);
    expect((await page.goto("/w/hello"))?.status()).toBe(404);

    // The admin sees both outcomes; an unsubscribed contact can't be emailed.
    await loginAsAdmin(page);
    await page.goto("/admin/outreach?s=unsubscribed");
    const rowB = page.locator(`[data-contact="${b.email}"]`);
    await expect(rowB).toContainText("Unsubscribed");
    await expect(rowB.getByRole("button", { name: "Copy email" })).toHaveCount(0);
    await page.goto("/admin/outreach?s=signed_up");
    await expect(page.locator(`[data-contact="${a.email}"]`)).toContainText("Asked to join");
  } finally {
    psql(`delete from public.sponsor_requests where company_name = '${a.company}'`);
    psql(`delete from public.outreach_contacts where email like '%-${id}@outreach.test'`);
  }
});
