import { expect, test } from "@playwright/test";
import { psql } from "./db";
import { login } from "./helpers";
import { addPayment, startSolanaMock, WEBHOOK_SECRET } from "./solana-mock";

// USDT on Solana: the sponsor buys a pack, pays the exact amount, and the
// E-coins arrive once the payment is on the (fake) blockchain.
const SPONSOR = "employer@wemuste.local";
let server: Awaited<ReturnType<typeof startSolanaMock>>;
test.beforeAll(async () => {
  server = await startSolanaMock();
});
test.afterAll(() => {
  server.close();
  psql(
    `delete from public.payment_orders where employer_id = (select id from auth.users where email = '${SPONSOR}')`,
  );
  psql(`delete from public.payment_transfers where signature like '5%'`);
});

// Fake transaction IDs in base58 (no 0, O, I or l), 88 characters like real ones.
const sig = (n: number) => `5${"ABCDEFGHJK"[n]}`.padEnd(88, "Q");

test("a sponsor buys E-coins with USDT: exact amount, paid once, wrong amounts wait for an admin", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  const sponsorId = psql(`select id from auth.users where email = '${SPONSOR}'`);
  psql(`update public.employer_profiles set ecoin_balance = 0 where user_id = '${sponsorId}'`);
  await login(page, SPONSOR);
  await expect(page).toHaveURL(/\/sponsor$/);
  await page.goto("/sponsor/coins");
  await expect(page.getByRole("heading", { name: "Buy E-coins" })).toBeVisible();
  // Every pack is at or above the minimum payment ($10), so each can be bought.
  for (const pack of ["pack-10", "pack-50", "pack-200"]) {
    await expect(
      page.locator(`[data-pack="${pack}"]`).getByRole("button", { name: "Pay with USDT" }),
    ).toBeVisible();
  }
  await page
    .locator('[data-pack="pack-50"]')
    .getByRole("button", { name: "Pay with USDT" })
    .click();
  await expect(page).toHaveURL(/\/sponsor\/coins\/[0-9a-f-]{36}$/);
  const orderId = page.url().split("/").pop()!;
  const micro = Number(
    psql(`select amount_micro from public.payment_orders where id = '${orderId}'`),
  );
  const amount = (micro / 1e6).toFixed(4);
  await expect(page.getByRole("heading", { name: `Pay ${amount} USDT` })).toBeVisible();
  await expect(page.getByText("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")).toBeVisible();
  await expect(page.getByText(/Send only USDT, and only on the Solana network/)).toBeVisible();
  await expect(page.getByRole("timer")).toContainText(/Time left: (29|30):/);

  // The webhook refuses notices without the secret.
  const denied = await request.post("/api/payments/solana", { data: [{ signature: sig(1) }] });
  expect(denied.status()).toBe(401);

  // A wrong amount arrives: nothing is added; the admin will see it.
  addPayment(sig(1), micro + 100);
  const notice = await request.post("/api/payments/solana", {
    data: [{ signature: sig(1) }],
    headers: { authorization: WEBHOOK_SECRET },
  });
  expect(notice.ok()).toBe(true);
  // (The page's own check may have read it first: either way it's recorded once, unmatched.)
  expect(
    psql(
      `select count(*) || '|' || coalesce(max(order_id::text), 'none') from public.payment_transfers where signature = '${sig(1)}'`,
    ),
  ).toBe("1|none");
  expect(
    psql(`select ecoin_balance from public.employer_profiles where user_id = '${sponsorId}'`),
  ).toBe("0");

  // The exact amount arrives; "check now" finds it on the blockchain.
  addPayment(sig(2), micro);
  await page.getByRole("button", { name: "I've paid — check now" }).click();
  await expect(page.getByRole("heading", { name: "Payment received" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("50 E-coins were added to your account.")).toBeVisible();
  expect(
    psql(`select ecoin_balance from public.employer_profiles where user_id = '${sponsorId}'`),
  ).toBe("50");

  // The same notice again adds nothing.
  await request.post("/api/payments/solana", {
    data: [{ signature: sig(2) }],
    headers: { authorization: WEBHOOK_SECRET },
  });
  expect(
    psql(`select ecoin_balance from public.employer_profiles where user_id = '${sponsorId}'`),
  ).toBe("50");
  await page.goto("/sponsor/coins");
  await expect(page.getByRole("link", { name: new RegExp(`${amount} USDT.*Paid`) })).toBeVisible();
});
