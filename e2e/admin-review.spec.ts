import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./admin-session";
import { psql, removeObjects } from "./db";
import { JOB, PHONE, seedApplication } from "./seed-application";
import { acceptConfirms, answerAll, login, signOut, unique } from "./helpers";
import { waitForEmail } from "./mailpit";

test("an admin reviews an application (answers, logged video view, approval); the sponsor opens it with an E-coin", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await acceptConfirms(page);
  const name = `Omar Review ${unique()}`;
  const { appId, paths } = await seedApplication(name);

  try {
    await loginAsAdmin(page);
    await page
      .getByRole("navigation", { name: "Admin" })
      .getByRole("link", { name: "Applications" })
      .click();
    await expect(page.getByRole("heading", { name: "Applications", exact: true })).toBeVisible();

    // Filter by job; there is no score to filter by.
    await expect(page.getByLabel(/Minimum score/)).toHaveCount(0);
    await page.getByLabel("Job", { exact: true }).selectOption({ label: JOB });
    await page.getByRole("button", { name: "Filter" }).click();
    await page.getByRole("link", { name: new RegExp(name) }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/applications/${appId}`));
    await expect(page.getByRole("heading", { name })).toBeVisible();
    await expect(page.getByText(PHONE)).toBeVisible();
    await expect(page.getByText(/%/)).toHaveCount(0); // nothing is scored

    // Test tab: the answers as given (no right/wrong, no grading).
    await expect(page.getByText("Listen and apologise")).toBeVisible();
    await expect(page.getByText("I love serving people")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save grade" })).toHaveCount(0);

    // Video tab: a short-lived link, and the view is logged.
    await page.getByRole("link", { name: "Video" }).click();
    await page
      .getByRole("button", { name: /Play video/ })
      .first()
      .click();
    const video = page.locator("video").first();
    await expect(video).toHaveAttribute("src", /\/storage\/v1\/object\/sign\/application-videos\//);
    expect(
      psql(
        `select count(*) from public.audit_logs where action = 'application.video_viewed' and target_id = '${appId}'`,
      ),
    ).toBe("1");

    // Survey tab shows the answers.
    await page.getByRole("link", { name: "Survey" }).click();
    await expect(page.getByText("Latte art")).toBeVisible();

    // Approve with notes.
    await page.getByLabel("Notes").fill("Friendly, good answers.");
    await page.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText("Approved", { exact: true }).first()).toBeVisible();
    expect(
      psql(`select status || '|' || admin_notes from public.applications where id = '${appId}'`),
    ).toBe("approved|Friendly, good answers.");

    // The audit log links back to the application.
    await page.goto("/admin/audit?action=application.reviewed");
    await expect(
      page.getByRole("link", { name: "application", exact: true }).first(),
    ).toHaveAttribute("href", `/admin/applications/${appId}`);

    // The sponsor who posted the job now sees the candidate (and was emailed).
    const since = new Date(Date.now() - 60_000);
    const sponsorEmail = "employer@wemuste.local";
    const notice = await waitForEmail(sponsorEmail, /You have a new candidate/, since);
    expect(JSON.stringify(notice)).not.toContain(name);
    // The admin gives the sponsor an E-coin.
    const sponsorId = psql(`select id from auth.users where email = '${sponsorEmail}'`);
    psql(`update public.employer_profiles set ecoin_balance = 0 where user_id = '${sponsorId}'`);
    await page.goto(`/admin/sponsors/${sponsorId}`);
    await page.getByLabel("Amount").fill("1");
    await page.getByRole("button", { name: "Update balance" }).click();
    await expect(page.getByText("Balance updated.")).toBeVisible();

    await signOut(page);
    await login(page, sponsorEmail);
    await expect(page.getByRole("link", { name: /new candidate/ })).toBeVisible(); // the bell
    await page.getByRole("link", { name: /new candidate/ }).click();
    await expect(page).toHaveURL(/\/sponsor\/candidates$/);
    await page.getByRole("link", { name: new RegExp(name) }).click();

    // Locked: only the name; the rest opens with 1 E-coin.
    await expect(page.getByRole("heading", { name })).toBeVisible();
    await expect(page.getByText(PHONE)).toHaveCount(0);
    await page.getByRole("button", { name: "Open for 1 E-coin" }).click();
    await expect(page.getByText(PHONE)).toBeVisible();
    expect(
      psql(`select ecoin_balance from public.employer_profiles where user_id = '${sponsorId}'`),
    ).toBe("0");
    await expect(page.getByRole("heading", { name: "Test answers" })).toBeVisible();
    await expect(page.getByText("I love serving people")).toBeVisible();
    await expect(page.getByText("Latte art")).toBeVisible();
    // It stays open (no second charge).
    await page.reload();
    await expect(page.getByText(PHONE)).toBeVisible();
    await expect(page.getByText("Friendly, good answers.")).toHaveCount(0); // admin notes stay private
    await page
      .getByRole("button", { name: /Play video/ })
      .first()
      .click();
    await expect(page.locator("video").first()).toHaveAttribute(
      "src",
      /\/storage\/v1\/object\/sign\//,
    );
    expect(
      psql(`select count(*) from public.audit_logs a join public.profiles p on p.id = a.actor_id
            where a.action = 'application.video_viewed' and a.target_id = '${appId}' and p.role = 'employer'`),
    ).toBe("1");
  } finally {
    await removeObjects("application-videos", paths);
    psql(`delete from public.applicants where phone_e164 = '${PHONE}'`);
    psql(`delete from public.ecoin_ledger where employer_id =
            (select id from auth.users where email = 'employer@wemuste.local')`);
  }
});
