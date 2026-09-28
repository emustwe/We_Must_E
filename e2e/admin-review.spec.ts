import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./admin-session";
import { psql, removeObjects } from "./db";
import { JOB, PHONE, seedApplication } from "./seed-application";
import { acceptConfirms, answerAll, login, signOut, unique } from "./helpers";
import { waitForEmail } from "./mailpit";

test("an admin reviews an application (answers, logged video view, approval); the sponsor sees it and opens the contact with E-coins", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await acceptConfirms(page);
  const name = `Omar Review ${unique()}`;
  const { appId, paths } = await seedApplication(name);

  try {
    await loginAsAdmin(page);
    // Phones: the sidebar is a drawer behind the menu button.
    await page.getByRole("button", { name: "Open menu" }).click();
    await page
      .getByRole("navigation", { name: "Admin" })
      .getByRole("link", { name: "Applications" })
      .click();
    await expect(page.getByRole("heading", { name: "Applications", exact: true })).toBeVisible();

    // Filter by job; there is no score to filter by.
    await expect(page.getByLabel(/Minimum score/)).toHaveCount(0);
    await page
      .getByLabel("Job", { exact: true })
      .selectOption({ label: JOB.replace("[SAMPLE] ", "") });
    await expect(page).toHaveURL(/job=/);
    await page.getByRole("link", { name: new RegExp(name) }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/applications/${appId}`));
    await expect(page.getByRole("heading", { name })).toBeVisible();
    await expect(page.getByText(/%/)).toHaveCount(0); // nothing is scored
    // Contact details are under "More actions".
    await page.getByRole("button", { name: "More actions" }).click();
    await expect(page.getByText(PHONE)).toBeVisible();

    // Test answers as given (no right/wrong, no grading).
    await expect(page.getByText("Listen and apologise")).toBeVisible();
    await expect(page.getByText("I love serving people")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save grade" })).toHaveCount(0);

    // Video: a short-lived link, and the view is logged.
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

    // Survey answers behind "Show all answers".
    await page.getByRole("button", { name: "Show all answers" }).click();
    await expect(page.getByText("Latte art")).toBeVisible();

    // Approve with notes.
    await page.getByLabel("Notes").fill("Friendly, good answers.");
    await page.getByRole("button", { name: "Approve" }).click();
    await expect(
      page.locator('section[aria-labelledby="app-name"]').getByText("Approved", { exact: true }),
    ).toBeVisible();
    expect(
      psql(`select status || '|' || admin_notes from public.applications where id = '${appId}'`),
    ).toBe("approved|Friendly, good answers.");

    // The audit log links back to the application.
    await page.goto("/admin/audit?action=application.reviewed");
    await expect(
      page.getByRole("link", { name: "Application", exact: true }).first(),
    ).toHaveAttribute("href", `/admin/applications/${appId}`);

    // The sponsor who posted the job now sees the candidate (and was emailed).
    const since = new Date(Date.now() - 60_000);
    const sponsorEmail = "employer@wemuste.local";
    const notice = await waitForEmail(sponsorEmail, /You have a new candidate/, since);
    expect(JSON.stringify(notice)).not.toContain(name);
    // The admin gives the sponsor E-coins.
    const sponsorId = psql(`select id from auth.users where email = '${sponsorEmail}'`);
    psql(`update public.employer_profiles set ecoin_balance = 0 where user_id = '${sponsorId}'`);
    await page.goto(`/admin/sponsors/${sponsorId}`);
    await page.getByLabel("Amount").fill("50");
    await page.getByRole("button", { name: "Update balance" }).click();
    await expect(page.getByText("Balance updated.")).toBeVisible();
    // The message covers the phone menu until it goes away.
    await expect(page.getByText("Balance updated.")).toBeHidden({ timeout: 10_000 });

    await signOut(page);
    await login(page, sponsorEmail);
    await expect(page.getByRole("link", { name: /new candidate/ })).toBeVisible(); // the bell
    await page.getByRole("link", { name: /new candidate/ }).click();
    await expect(page).toHaveURL(/\/sponsor\/candidates$/);
    const label = `Candidate ${appId.replace(/-/g, "").slice(0, 5).toUpperCase()}`;
    await page.getByRole("link", { name: new RegExp(label) }).click();

    // Before paying: the whole application, but no name, phone, email or CV.
    await expect(page.getByRole("heading", { name: label })).toBeVisible();
    await expect(page.getByText(name)).toHaveCount(0);
    await expect(page.getByText(PHONE)).toHaveCount(0);
    // Not just hidden on screen: the contact details are not in the page at all.
    const html = await page.content();
    expect(html).not.toContain(PHONE.replace(/^\+/, ""));
    expect(html).not.toContain(name);
    await expect(page.getByRole("heading", { name: "Test answers" })).toBeVisible();
    await expect(page.getByText("I love serving people")).toBeVisible();
    await expect(page.getByRole("button", { name: /Play video/ }).first()).toBeVisible();
    // The price: this job's approved candidates not yet counted in a payment.
    const price = Number(
      psql(`select count(*) from public.applications a where a.status = 'approved'
              and a.job_id = (select job_id from public.applications where id = '${appId}')
              and not exists (select 1 from public.candidate_counted c where c.application_id = a.id)`),
    );
    const open = page.getByRole("button", {
      name: `Open contact for ${price} E-coin${price === 1 ? "" : "s"}`,
    });
    await open.click();
    await expect(page.getByText(PHONE)).toBeVisible();
    await expect(page.getByRole("heading", { name })).toBeVisible();
    expect(
      psql(`select ecoin_balance from public.employer_profiles where user_id = '${sponsorId}'`),
    ).toBe(String(50 - price));
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

test("an admin deletes an application permanently: files, answers and contact details", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await acceptConfirms(page);
  const name = `Delete Me ${unique()}`;
  const { appId, paths } = await seedApplication(name);
  try {
    await loginAsAdmin(page);
    await page.goto(`/admin/applications/${appId}`);
    await expect(page.getByRole("heading", { name })).toBeVisible();
    await page.getByRole("button", { name: "Delete permanently" }).click();
    await expect(page.getByText("Application deleted.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/applications$/);

    expect(psql(`select count(*) from public.applications where id = '${appId}'`)).toBe("0");
    expect(psql(`select count(*) from public.applicants where phone_e164 = '${PHONE}'`)).toBe("0");
    expect(
      psql(
        `select count(*) from storage.objects where bucket_id = 'application-videos' and name like '${appId}/%'`,
      ),
    ).toBe("0");
    expect(
      psql(
        `select metadata->>'reason' from public.audit_logs where action = 'application.deleted' and target_id = '${appId}'`,
      ),
    ).toBe("admin");
  } finally {
    await removeObjects("application-videos", paths);
    psql(`delete from public.applications where id = '${appId}'`);
    psql(`delete from public.applicants where phone_e164 = '${PHONE}'`);
  }
});

test("when a sponsor closes a job, everyone who applied gets a kind 'job closed' email", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await acceptConfirms(page);
  const started = new Date();
  const { appId, paths } = await seedApplication(`Closed Job ${unique()}`);
  const email = `applicant-${unique()}@example.test`;
  psql(`update public.applications set contact_email = '${email}' where id = '${appId}'`);
  const jobId = psql(`select job_id from public.applications where id = '${appId}'`);
  try {
    await login(page, "employer@wemuste.local");
    await expect(page).toHaveURL(/\/sponsor$/);
    await page.goto(`/sponsor/jobs/${jobId}`);
    await page.getByRole("button", { name: "Close job" }).click();
    await expect(page.getByText("Closed").first()).toBeVisible();
    const mail = await waitForEmail(email, /An update on your application/, started);
    expect(mail.text).toMatch(/this job is now closed/i);
    expect(mail.text).toContain("Evening cashier");
  } finally {
    psql(`update public.jobs set status = 'published', closed_at = null where id = '${jobId}'`);
    await removeObjects("application-videos", paths);
    psql(`delete from public.applications where id = '${appId}'`);
    psql(`delete from public.applicants where phone_e164 = '${PHONE}'`);
  }
});
