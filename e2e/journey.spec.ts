import { expect, test, type Page } from "@playwright/test";
import { loginAsAdmin } from "./admin-session";
import { psql, removeObjects } from "./db";
import { acceptConfirms, answerAll, login, signOut, unique } from "./helpers";

// The whole journey, with whatever questions are live (so it keeps working
// when the admin replaces the [SAMPLE] content):
// visitor applies (test -> video -> survey) -> admin approves -> sponsor sees
// the candidate and can play the videos.
const SPONSOR = "employer@wemuste.local";
const PHONE_LOCAL = "050 777 8899";
const PHONE = "+971507778899";

// A 2-second WebM made in the browser, used as a video "picked from the phone".
async function makeVideoFile(page: Page) {
  const base64 = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext("2d")!;
    const rec = new MediaRecorder(canvas.captureStream(15), { mimeType: "video/webm" });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    let hue = 0;
    const timer = setInterval(() => {
      ctx.fillStyle = `hsl(${(hue += 12) % 360} 70% 50%)`;
      ctx.fillRect(0, 0, 320, 240);
    }, 60);
    rec.start(200);
    await new Promise((r) => setTimeout(r, 2000));
    await new Promise((r) => {
      rec.onstop = r;
      rec.stop();
    });
    clearInterval(timer);
    const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer());
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary);
  });
  return { name: "answer.webm", mimeType: "video/webm", buffer: Buffer.from(base64, "base64") };
}

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
  await expect(page.getByText(/Step 1 of 3 · Quick test/)).toBeVisible();
  await page.getByRole("button", { name: "Start the test" }).click();
  await expect(page.getByText(/^0 of \d+ answered$/)).toBeVisible();
  const testPrompts = await page.locator("main ol > li h2").allTextContents();
  await answerAll(page);
  await expect(page.getByText(/^(\d+) of \1 answered/)).toBeVisible();
  await page.getByRole("button", { name: "Finish test" }).click();

  // Step 2: one video explaining the same questions
  // (picked from the phone here; recording is covered in apply.spec).
  await expect(page.getByText(/Step 2 of 3 · Short video/)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Explain your answers in one video" }),
  ).toBeVisible();
  await expect(page.locator("main ol li")).toHaveCount(testPrompts.length);
  await page.getByLabel("Upload a video from my phone").setInputFiles(await makeVideoFile(page));
  await expect(page.getByText(/^Recorded \d:\d\d/)).toBeVisible();
  await page.getByRole("button", { name: "Use this video" }).click();

  // Step 3: contact, the survey questions and consent, on one page.
  await expect(page.getByText(/Step 3 of 3 · About you/)).toBeVisible();
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Phone number").fill(PHONE_LOCAL);
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
  expect(videos, "one video saved").toBe(1);
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
