import { execSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./admin-session";
import { psql, removeObjects } from "./db";
import { acceptConfirms, makeVideoFile } from "./helpers";

// The real interview (scripts/setup-real-interview.mts): Test with a timed
// typing question and 24 written answers, Task with the full profile, CV and
// 7 videos of 30 s, then the 25-question Survey. Every field is required.
const TITLE = "Online Office & Translation Administrator";
const PHONE = "+971509876543";

test.beforeAll(() => {
  execSync("npx tsx scripts/setup-real-interview.mts", { stdio: "ignore" });
});

test.afterAll(async () => {
  const apps = psql(`select a.id from public.applications a join public.jobs j on j.id = a.job_id
                     where j.title = '${TITLE}'`)
    .split("\n")
    .filter(Boolean);
  for (const id of apps) {
    const videos = psql(
      `select storage_path from public.application_videos where application_id = '${id}'`,
    )
      .split("\n")
      .filter(Boolean);
    await removeObjects("application-videos", videos);
    const cv = psql(`select coalesce(cv_path, '') from public.applications where id = '${id}'`);
    if (cv) await removeObjects("application-cvs", [cv]);
  }
  psql(`delete from public.applicants where phone_e164 = '${PHONE}'`);
  psql(
    `delete from public.applications a using public.jobs j where j.id = a.job_id and j.title = '${TITLE}'`,
  );
});

test("a candidate completes the real interview: Test, Task (profile, CV, 7 videos), Survey", async ({
  page,
}) => {
  test.setTimeout(360_000);
  await acceptConfirms(page);
  const jobId = psql(`select id from public.jobs where title = '${TITLE}'`);

  await page.goto(`/apply/${jobId}`);
  await page.getByRole("button", { name: "Start application" }).click();

  // ------------------------------------------------------------ Test
  await expect(page.getByText("Step 1 of 3 · Test")).toBeVisible();
  await expect(page.getByText(/25 questions/)).toBeVisible();
  await expect(page.getByText(/You'll have 25 minutes/)).toBeVisible();
  await page.getByRole("button", { name: "Start the test" }).click();
  await expect(page.getByText("0 of 25 answered")).toBeVisible();

  // Typing test: its own 2:00 timer, no pasting, keystrokes and backspaces counted.
  await page.getByRole("button", { name: "Start typing test" }).click();
  const box = page.getByLabel("Type the paragraph here");
  await box.pressSequentially("Dear Ms. Kimm", { delay: 5 });
  await box.press("Backspace");
  await box.pressSequentially(", thank you for contacting our support team", { delay: 5 });
  await page.getByRole("button", { name: "Finish typing" }).click();
  await expect(
    page.getByText(/Typing test finished: \d+ words per minute · \d+% accurate · 1 backspaces/),
  ).toBeVisible();

  // The other 24 written answers.
  const written = page.locator("main ol > li textarea:not([readonly])");
  await expect(written).toHaveCount(24);
  for (let i = 0; i < 24; i++) await written.nth(i).fill(`Answer ${i + 2}`);
  await expect(page.getByText("25 of 25 answered")).toBeVisible();
  await page.getByRole("button", { name: "Finish test" }).click();

  // ------------------------------------------------------------ Task
  await expect(page.getByText("Step 2 of 3 · Task")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Personal information" })).toBeVisible();
  // Everything is required: Continue flags the empty fields.
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Please fill in the highlighted fields.")).toBeVisible();

  const fill: [string, string][] = [
    ["Full name", "Min-su Kim"],
    ["Preferred name", "Minsu"],
    ["Age (optional)", "29"],
    ["Country", "United Arab Emirates"],
    ["City / Location", "Abu Dhabi"],
    ["Nationality", "Korean"],
    ["Phone number", "050 987 6543"],
    ["Email", "minsu@example.test"],
    ["Languages", "Korean, English"],
    ["Other languages", "None"],
    ["Previous employment", "Seoul Trading Co."],
    ["Previous job position", "Office administrator"],
    ["Years of experience", "4"],
    ["Previous work experience", "Handled customer documents and translations."],
    ["Why are you interested in this position?", "I enjoy translation and admin work."],
    ["What type of work environment do you prefer?", "Calm and organised."],
    ["What are you looking for in your next job?", "Growth and a good team."],
  ];
  for (const [label, value] of fill) await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel("Gender").selectOption("male");
  await page.getByLabel("English level").selectOption("fluent");
  await page.getByLabel("I confirm I am 18 years or older.").check();

  // CV: a PDF (checked on the server from its first bytes).
  await page.getByLabel("Resume / CV").setInputFiles({
    name: "cv.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"),
  });
  await expect(page.getByText("cv.pdf")).toBeVisible();

  // Seven video questions, one video each, 30 seconds max.
  await expect(page.getByText(/Question 1 of 7 · up to 30 seconds/)).toBeVisible();
  const video = await makeVideoFile(page);
  const cards = page.locator("#videos ol > li");
  await expect(cards).toHaveCount(7);
  await expect(cards.nth(0)).toContainText(
    "Please introduce yourself and tell us about your previous work experience.",
  );
  await expect(cards.nth(6)).toContainText("Anything you would like to mention");
  for (let i = 0; i < 7; i++) {
    const card = cards.nth(i);
    await card.getByRole("button", { name: "Record answer" }).click();
    await card.getByLabel("Upload a video from my phone").setInputFiles(video);
    await card.getByRole("button", { name: "Use this video" }).click();
    await expect(card.getByText("Your video is saved.")).toBeVisible({ timeout: 20_000 });
  }
  await page.getByRole("button", { name: "Continue" }).click();

  // ------------------------------------------------------------ Survey
  await expect(page.getByText("Step 3 of 3 · Survey")).toBeVisible();
  const questions = page.locator("main ol > li");
  await expect(questions).toHaveCount(25);
  // Q1: "Other" asks what.
  await questions.nth(0).getByText("Other", { exact: true }).click();
  await expect(questions.nth(0).getByLabel("Please tell us what")).toBeVisible();
  await questions.nth(0).getByLabel("Please tell us what").fill("Podcasts");
  for (let i = 1; i < 25; i++) {
    const q = questions.nth(i);
    const choice = q.locator('label:has(input[type="radio"]), label:has(input[type="checkbox"])');
    if (await choice.count()) await choice.first().click();
    else await q.locator("textarea").fill(`Survey answer ${i + 1}`);
  }
  await page.getByText(/I agree that Wemuste stores my information/).click();
  await page.getByRole("button", { name: "Send application" }).click();
  await expect(page.getByRole("heading", { name: "Application sent" })).toBeVisible();

  // ------------------------------------------------------------ stored
  const row = psql(
    `select a.status || '|' || p.full_name || '|' || (select count(*) from jsonb_object_keys(a.profile)) || '|' ||
            (a.cv_path is not null) || '|' ||
            (select count(*) from public.application_videos v where v.application_id = a.id) || '|' ||
            (select count(*) from public.application_test_answers t where t.application_id = a.id) || '|' ||
            (select count(*) from public.application_survey_answers s where s.application_id = a.id) || '|' ||
            (a.task_started_at is not null and a.survey_started_at is not null)
       from public.applications a join public.applicants p on p.id = a.applicant_id
      where p.phone_e164 = '${PHONE}'`,
  );
  expect(row).toBe("submitted|Min-su Kim|20|true|7|25|25|true");
  expect(
    psql(`select s.answer->>'other' from public.application_survey_answers s
           join public.applications a on a.id = s.application_id join public.applicants p on p.id = a.applicant_id
           join public.survey_questions q on q.id = s.question_id
          where p.phone_e164 = '${PHONE}' and q.position = 0`),
  ).toBe("Podcasts");

  // ------------------------------------------------------------ admin sees it all
  await loginAsAdmin(page);
  const appId =
    psql(`select a.id from public.applications a join public.applicants p on p.id = a.applicant_id
                      where p.phone_e164 = '${PHONE}'`);
  await page.goto(`/admin/applications/${appId}`);
  await expect(page.getByRole("heading", { name: "Min-su Kim" })).toBeVisible();
  await expect(page.getByText("Seoul Trading Co.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Open CV" })).toBeVisible();
  await expect(page.getByText(/WPM · \d+% accurate · 1 backspaces/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Play video/ })).toHaveCount(7);
});
