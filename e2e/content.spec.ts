import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./admin-session";
import { psql } from "./db";
import { acceptConfirms, unique } from "./helpers";

test("an admin builds an unscored test with written and multi-answer questions, and a video question set", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await acceptConfirms(page);
  const testTitle = `E2E test ${unique()}`;
  const setTitle = `E2E videos ${unique()}`;
  // Whatever set is live now is put back afterwards.
  const liveSet = psql(`select id from public.video_question_sets where is_active`);

  try {
    await loginAsAdmin(page);
    await page.goto("/admin/content");

    // A new test, untimed: the dashed "New test" button opens the form in place.
    const tests = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Test" }) });
    await expect(tests.getByText("In use now")).toBeVisible();
    await tests.getByRole("button", { name: "New test" }).click();
    await tests.getByLabel("Title").fill(testTitle);
    await tests.getByLabel("Time limit (minutes)").fill("0");
    await expect(tests.getByText("0 means no limit")).toBeVisible();
    await expect(tests.getByLabel(/Pass mark/)).toHaveCount(0); // nothing is scored
    await tests.getByRole("button", { name: "Create test" }).click();
    await expect(page).toHaveURL(/\/admin\/content\/tests\/[0-9a-f-]{36}$/);

    // Multi-choice: no "correct" answers and no points (nothing is scored).
    await page.getByRole("button", { name: "Add question" }).click();
    await expect(
      page.getByText("There are no right or wrong answers: applicants answer freely"),
    ).toBeVisible();
    await page.getByLabel("Question", { exact: true }).fill("Which of these do you enjoy?");
    await page.getByLabel("Answer type").selectOption("multi_choice");
    await expect(page.getByLabel("Points")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Mark as the correct answer" })).toHaveCount(0);
    await page.getByPlaceholder("Answer 1").fill("Cooking");
    await page.getByPlaceholder("Answer 2").fill("Driving");
    await page.getByRole("button", { name: "Add answer" }).click();
    await page.getByPlaceholder("Answer 3").fill("Cleaning");
    await page.getByRole("button", { name: "Save", exact: true }).last().click();
    await expect(page.getByText("Which of these do you enjoy?")).toBeVisible();

    // A written question: no options.
    await page.getByRole("button", { name: "Add question" }).click();
    await page.getByLabel("Question", { exact: true }).fill("Describe your last job.");
    await page.getByLabel("Answer type").selectOption("long_text");
    await page.getByRole("button", { name: "Save", exact: true }).last().click();
    await expect(page.getByText("Describe your last job.")).toBeVisible();

    // Wait until the editor has closed and both questions are stored, without keys.
    await expect(page.getByRole("button", { name: "Add question" })).toBeVisible();
    await expect
      .poll(() =>
        psql(
          `select string_agg(q.type || ':' || jsonb_array_length(q.options) || ':' || coalesce(k.correct_options::text, '-'), ',' order by q.position)
         from public.test_questions q join public.tests t on t.id = q.test_id
         left join public.test_answer_keys k on k.question_id = q.id where t.title = '${testTitle}'`,
        ),
      )
      .toBe("multi_choice:3:-,long_text:0:-");
    expect(
      psql(`select time_limit_seconds is null from public.tests where title = '${testTitle}'`),
    ).toBe("t");

    // A video question set with one question, made live.
    await page.goto("/admin/content");
    const videos = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Video questions" }) });
    await videos.getByRole("button", { name: "New video question set" }).click();
    await videos.getByLabel("Title").fill(setTitle);
    await videos.getByRole("button", { name: "Create set" }).click();
    await expect(page.getByRole("heading", { name: setTitle })).toBeVisible();
    await page.getByLabel("Question", { exact: true }).last().fill("Why do you want this job?");
    await page.getByRole("button", { name: "New video question" }).click();
    await expect(page.getByLabel("Question", { exact: true }).first()).toHaveValue(
      "Why do you want this job?",
    );
    await page.getByRole("button", { name: "Make live" }).click();
    await expect(page.getByText("Live", { exact: true })).toBeVisible();
    expect(
      psql(`select is_active from public.video_question_sets where title = '${setTitle}'`),
    ).toBe("t");
  } finally {
    // Put the sample video set back as the live one.
    psql(`update public.video_question_sets set is_active = false where title = '${setTitle}'`);
    if (liveSet)
      psql(`update public.video_question_sets set is_active = true where id = '${liveSet}'`);
    psql(`delete from public.video_question_sets where title = '${setTitle}'`);
    psql(`delete from public.tests where title = '${testTitle}'`);
  }
});

test("the admin is warned when a step has no live questions", async ({ page }) => {
  const live = psql(`select id from public.surveys where is_active`);
  psql(`update public.surveys set is_active = false`);
  try {
    await loginAsAdmin(page);
    await expect(
      page.getByRole("alert").filter({ hasText: "Applicants are skipping: survey" }),
    ).toBeVisible();
    await page.goto("/admin/content");
    await expect(page.getByText("Applicants are skipping: survey")).toBeVisible();
  } finally {
    if (live) psql(`update public.surveys set is_active = true where id = '${live}'`);
  }
  await page.goto("/admin");
  await expect(page.getByText(/Applicants are skipping/)).toHaveCount(0);
});
