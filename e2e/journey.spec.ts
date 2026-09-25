import { expect, test, type Page } from "@playwright/test";
import { loginAsAdmin } from "./admin-session";
import { psql, removeObjects } from "./db";
import { acceptConfirms, answerAll, login, makeVideoFile, signOut, unique } from "./helpers";

// The whole journey, with whatever questions are live (so it keeps working
// when the admin replaces the [SAMPLE] content):
// visitor applies (test -> video -> survey) -> admin approves -> sponsor sees
// the candidate and can play the videos.
const SPONSOR = "employer@wemuste.local";
const PHONE_LOCAL = "050 777 8899";
const PHONE = "+971507778899";

test.afterEach(async () => {
  const paths = psql(
    `select o.name from storage.objects o join public.applications a on o.name like a.id || '/%'
       join public.applicants p on p.id = a.applicant_id
      where o.bucket_id = 'application-videos' and p.phone_e164 = '${PHONE}'`,
  )
    .split("\n")
    .filter(Boolean);
  await removeObjects("application-videos", paths);
  psql(`delete from public.applicants where phone_e164 = '${PHONE}'`);
  psql(`delete from public.applications where status = 'in_progress' and draft_token_hash is not null
        and job_id in (select id from public.jobs where title = '[SAMPLE] Evening cashier')`);
});

test("full journey: apply with test, video and survey -> admin approves -> sponsor sees the candidate", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await acceptConfirms(page);
  const name = `Journey Applicant ${unique()}`;
  const job = psql(`select id from public.jobs where title = '[SAMPLE] Evening cashier'`);

  // ---------------------------------------------------------------- visitor
  await page.goto(`/?job=${job}`);
  await page.getByRole("link", { name: "Apply" }).click();
  await page.getByRole("button", { name: "Start application" }).click();

  // Step 1: the test, every question on one page (every step must be there).
  await expect(page.getByText(/Step 1 of 3 · Test/)).toBeVisible();
  await page.getByRole("button", { name: "Start the test" }).click();
  await expect(page.getByText(/^0 of \d+ answered$/)).toBeVisible();
  const testPrompts = await page.locator("main ol > li h2").allTextContents();
  await answerAll(page);
  await expect(page.getByText(/^(\d+) of \1 answered/)).toBeVisible();
  await page.getByRole("button", { name: "Finish test" }).click();

  // Step 2: Task — contact details, then a video per video question
  // (picked from the phone here; recording is covered in apply.spec).
  await expect(page.getByText(/Step 2 of 3 · Task/)).toBeVisible();
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Phone number").fill(PHONE_LOCAL);
  const cards = page.locator("#videos ol > li");
  const video = await makeVideoFile(page);
  const total = await cards.count();
  expect(total, "every video question is listed").toBeGreaterThan(0);
  for (let i = 0; i < total; i++) {
    await cards.nth(i).getByRole("button", { name: "Record answer" }).click();
    await cards.nth(i).getByLabel("Upload a video from my phone").setInputFiles(video);
    await cards.nth(i).getByRole("button", { name: "Use this video" }).click();
    await expect(cards.nth(i).getByText("Your video is saved.")).toBeVisible({ timeout: 20_000 });
  }
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 3: the survey questions and consent, on one page.
  await expect(page.getByText(/Step 3 of 3 · Survey/)).toBeVisible();
  await answerAll(page);
  await page.getByText(/I agree that Wemuste stores my information/).click();
  await page.getByRole("button", { name: "Send application" }).click();
  await expect(page.getByRole("heading", { name: "Application sent" })).toBeVisible();

  const counts = psql(
    `select (select count(*) from public.application_test_answers t where t.application_id = a.id) || '|' ||
            (select count(*) from public.application_videos v where v.application_id = a.id) || '|' ||
            (select count(*) from public.application_survey_answers s where s.application_id = a.id)
       from public.applications a join public.applicants p on p.id = a.applicant_id
      where p.phone_e164 = '${PHONE}'`,
  );
  const [tests, videos, survey] = counts.split("|").map(Number);
  expect(tests, "test answers saved").toBeGreaterThan(0);
  expect(videos, "a video per question saved").toBe(total);
  expect(survey, "survey answers saved").toBeGreaterThan(0);

  // ---------------------------------------------------------------- admin
  await loginAsAdmin(page);
  await page.goto("/admin/applications");
  await page.getByRole("link", { name: new RegExp(name) }).click();
  await expect(page.getByRole("button", { name: /Play video/ })).toHaveCount(videos);
  await page.getByLabel("Notes").fill("Good answers.");
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(
    page.locator('section[aria-labelledby="app-name"]').getByText("Approved", { exact: true }),
  ).toBeVisible();
  await signOut(page);

  // ---------------------------------------------------------------- sponsor
  // E-coins are added by hand for now (a wallet comes later).
  psql(`update public.employer_profiles set ecoin_balance = 1
         where user_id = (select id from auth.users where email = '${SPONSOR}')`);
  await login(page, SPONSOR);
  await expect(page).toHaveURL(/\/sponsor$/);
  await page.goto(`/sponsor/jobs/${job}`);
  await page.getByRole("link", { name: new RegExp(name) }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await page.getByRole("button", { name: "Open for 1 E-coin" }).click();
  // The test answers are shared too, question by question.
  const testAnswers = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Test answers" }) });
  await expect(testAnswers.locator("dt")).toHaveText(testPrompts);
  await expect(page.getByText(PHONE)).toBeVisible();
  await expect(page.getByRole("button", { name: /Play video/ })).toHaveCount(videos);
  await page
    .getByRole("button", { name: /Play video/ })
    .first()
    .click();
  await expect(page.locator("video").first()).toHaveAttribute(
    "src",
    /\/storage\/v1\/object\/sign\//,
  );
  await expect(page.getByText("Good answers.")).toHaveCount(0); // admin notes stay private
});
