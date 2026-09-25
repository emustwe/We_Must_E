import { expect, test, type Page } from "@playwright/test";
import { env, psql, removeObjects } from "./db";
import { waitForEmail } from "./mailpit";

// A visitor with no account applies to a job: test, video (fake camera), survey.
const JOB_TITLE = "[SAMPLE] Weekend barista";
const jobId = () => psql(`select id from public.jobs where title = '${JOB_TITLE}'`);

async function recordAnswer(page: Page) {
  if (await page.getByRole("button", { name: "Turn on camera" }).isVisible()) {
    await page.getByRole("button", { name: "Turn on camera" }).click();
  }
  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(page.getByText(/^Recording \d/)).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Stop" }).click();
  await page.getByRole("button", { name: "Use this video" }).click();
}

test.afterEach(async () => {
  // Uploaded videos first (the rows point to them), then the rows.
  const paths = psql(
    `select o.name from storage.objects o join public.applications a on o.name like a.id || '/%'
      where o.bucket_id = 'application-videos' and a.job_id = '${jobId()}'`,
  )
    .split("\n")
    .filter(Boolean);
  await removeObjects("application-videos", paths);
  psql(`delete from public.applicants where phone_e164 = '+971501112233'`);
  psql(`delete from public.applications where job_id = '${jobId()}'`);
});

test("a visitor applies in 3 steps without an account, and nothing reaches the employer", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const since = new Date(Date.now() - 1000);
  const id = jobId();

  await page.goto(`/?job=${id}`);
  await page.getByRole("link", { name: "Apply" }).click();
  await expect(page).toHaveURL(new RegExp(`/apply/${id}$`));
  await page.getByRole("button", { name: "Start application" }).click();

  // --- Test (timed on the server): every question on one page, autosaved.
  await expect(page.getByText("Step 1 of 3 · Quick test")).toBeVisible();
  await page.getByRole("button", { name: "Start the test" }).click();
  await expect(page.getByText("0 of 3 answered")).toBeVisible();
  await expect(page.getByText("Time left")).toBeAttached(); // the timer
  await page.getByText("Listen and apologise").click();
  await expect(page.getByText("1 of 3 answered")).toBeVisible();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible(); // confirmed by the server

  // Reloading keeps the saved answer.
  await page.reload();
  await expect(page.getByRole("radio", { name: "Listen and apologise" })).toBeChecked();

  // Finishing with a question left open points at it.
  await page.getByText("8:50").click();
  await page.getByRole("button", { name: "Finish test" }).click();
  await expect(page.getByText("1 question still needs an answer.")).toBeVisible();
  await page.getByLabel("Type your answer").fill("I enjoy helping people.");
  await page.getByRole("button", { name: "Finish test" }).click();
  // A centred popup (not the browser's), then the answers are locked in.
  const confirm = page.getByRole("dialog", { name: "Finish the test?" });
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "Finish test" }).click();

  // --- Video: one video explaining the same test questions.
  await expect(page.getByText("Step 2 of 3 · Short video")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Explain your answers in one video" }),
  ).toBeVisible();
  const prompts = page.locator("main ol li");
  await expect(prompts).toHaveCount(3);
  await expect(prompts.nth(0)).toContainText("A customer is upset about a late order");
  await expect(prompts.nth(2)).toContainText("why do you want this job?");
  await expect(page.getByText(/Up to 5:00 in total/)).toBeVisible();
  await recordAnswer(page);

  // --- Survey: contact details and every question on one page.
  await expect(page.getByText("Step 3 of 3 · About you")).toBeVisible();
  await expect(page.getByRole("heading", { name: "How can we reach you?" })).toBeVisible();
  const consent = page.getByRole("checkbox", {
    name: /I agree that Wemuste stores my information/,
  });
  await expect(consent).not.toBeChecked(); // never pre-ticked
  await page.getByLabel("Full name").fill("Sara Ahmed");
  await page.getByLabel("Phone number").fill("12");
  await page.getByText("This week").click();
  await page.getByRole("button", { name: "Send application" }).click();
  await expect(page.getByText("Please enter a valid phone number")).toBeVisible();
  await page.getByLabel("Phone number").fill("050 111 2233");
  await page.getByRole("button", { name: "Send application" }).click();
  await expect(page.getByText("Please answer this question.")).toBeVisible(); // the kinds of work
  await page.getByText("Retail").click();
  await page.getByText("Delivery").click();
  await page.getByRole("button", { name: "Send application" }).click();
  await expect(page.getByText("Please tick the box to agree before sending.")).toBeVisible();
  await page.getByText(/I agree that Wemuste stores my information/).click();
  await page.getByRole("button", { name: "Send application" }).click();

  await expect(page).toHaveURL(new RegExp(`/apply/${id}/submitted$`));
  await expect(page.getByRole("heading", { name: "Application sent" })).toBeVisible();
  await expect(page.getByText("We'll contact you if you're shortlisted.")).toBeVisible();

  // Stored once, not scored, with the one video in private storage.
  const row = psql(
    `select a.status || '|' || (a.test_score is null) || '|' || p.phone_e164 || '|' ||
            (select count(*) from public.application_videos v where v.application_id = a.id) || '|' ||
            (select count(*) from storage.objects o where o.bucket_id = 'application-videos'
               and o.name like a.id || '/%') || '|' || (a.draft_token_hash is null)
       from public.applications a join public.applicants p on p.id = a.applicant_id
      where a.job_id = '${id}'`,
  );
  expect(row).toBe("submitted|true|+971501112233|1|1|true");

  // The team is told, without personal data; the employer is not.
  const email = await waitForEmail("admin@wemuste.local", /New application to review/, since);
  expect(JSON.stringify(email)).not.toContain("Sara");
  expect(JSON.stringify(email)).not.toContain("501112233");
  expect(
    psql(`select count(*) from public.applications a join public.jobs j on j.id = a.job_id
          where j.id = '${id}' and a.status = 'approved'`),
  ).toBe("0");

  // The cookie is gone: coming back starts a fresh application.
  await page.goto(`/apply/${id}`);
  await expect(page.getByRole("button", { name: "Start application" })).toBeVisible();
});

test("the cleanup job needs the cron secret", async ({ request }) => {
  expect((await request.get("/api/cron/cleanup")).status()).toBe(401);
  expect(
    (
      await request.get("/api/cron/cleanup", { headers: { authorization: "Bearer wrong" } })
    ).status(),
  ).toBe(401);
  const ok = await request.get("/api/cron/cleanup", {
    headers: { authorization: `Bearer ${env.CRON_SECRET}` },
  });
  expect(ok.status()).toBe(200);
  expect(await ok.json()).toMatchObject({ applications: expect.any(Number) });
});
