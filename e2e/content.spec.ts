import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./admin-session";
import { psql } from "./db";
import { unique } from "./helpers";

test("an admin builds a test with written and multi-answer questions, and a video question set", async ({
  page,
}) => {
  test.setTimeout(120_000);
  page.on("dialog", (dialog) => dialog.accept());
  const testTitle = `E2E test ${unique()}`;
  const setTitle = `E2E videos ${unique()}`;

  try {
    await loginAsAdmin(page);
    await page.goto("/admin/content");

    // A new test, untimed.
    const tests = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Tests" }) });
    await tests.getByLabel("Title").fill(testTitle);
    await tests.getByLabel("Time limit (minutes, 0 = none)").fill("0");
    await tests.getByRole("button", { name: "New test" }).click();
    await expect(page).toHaveURL(/\/admin\/content\/tests\/[0-9a-f-]{36}$/);

    // Multi-choice with two correct answers, worth 2 points.
    await page.getByRole("button", { name: "Add question" }).click();
    await page.getByLabel("Question", { exact: true }).fill("Which of these are safe at work?");
    await page.getByLabel("Answer type").selectOption("multi_choice");
    await page.getByLabel("Points").fill("2");
    await page.getByPlaceholder("Answer 1").fill("Gloves");
    await page.getByPlaceholder("Answer 2").fill("Running");
    await page.getByRole("button", { name: "Add answer" }).click();
    await page.getByPlaceholder("Answer 3").fill("Goggles");
    const marks = page.getByRole("button", { name: "Mark as the correct answer" });
    await marks.nth(0).click();
    await marks.nth(2).click();
    await page.getByRole("button", { name: "Save", exact: true }).last().click();
    await expect(page.getByText("✓ Gloves")).toBeVisible();
    await expect(page.getByText("✓ Goggles")).toBeVisible();
    await expect(page.getByText("2 points")).toBeVisible();

    // A written question: no options, graded by an admin later.
    await page.getByRole("button", { name: "Add question" }).click();
    await page.getByLabel("Question", { exact: true }).fill("Describe your last job.");
    await page.getByLabel("Answer type").selectOption("long_text");
    await expect(page.getByText("Written answers are graded by an admin")).toBeVisible();
    await page.getByRole("button", { name: "Save", exact: true }).last().click();
    await expect(page.getByText("Describe your last job.")).toBeVisible();

    const stored = psql(
      `select string_agg(q.type || ':' || q.points || ':' || coalesce(k.correct_options::text, '-'), ',' order by q.position)
         from public.test_questions q join public.tests t on t.id = q.test_id
         left join public.test_answer_keys k on k.question_id = q.id where t.title = '${testTitle}'`,
    );
    expect(stored).toBe("multi_choice:2:{0,2},long_text:1:-");
    expect(
      psql(`select time_limit_seconds is null from public.tests where title = '${testTitle}'`),
    ).toBe("t");

    // A video question set with one question, made live.
    await page.goto("/admin/content");
    const videos = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Video questions" }) });
    await videos.getByLabel("Title").fill(setTitle);
    await videos.getByRole("button", { name: "New video question set" }).click();
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
    psql(
      `update public.video_question_sets set is_active = true where id = '20000000-0000-0000-0000-000000000006'`,
    );
    psql(`delete from public.video_question_sets where title = '${setTitle}'`);
    psql(`delete from public.tests where title = '${testTitle}'`);
  }
});
