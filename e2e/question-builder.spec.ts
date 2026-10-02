import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./admin-session";
import { requests, startAnthropicMock } from "./anthropic-mock";
import { psql } from "./db";
import { unique } from "./helpers";

// Question builder: an admin pastes a job, the AI writes it in the WemustE
// pattern (25 test questions, 7 videos; the survey stays), the admin edits
// and saves it, then connects it with a sponsor's job waiting for approval.
let server: Awaited<ReturnType<typeof startAnthropicMock>>;
test.beforeAll(async () => {
  server = await startAnthropicMock();
});
test.afterAll(() => server.close());

test("an admin generates a job's questions, edits, saves and connects them with a waiting job", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const id = unique();
  const title = `Line Cook ${id}`;
  const jobTitle = `Kitchen helper ${id}`;
  const sponsorId = psql(`select id from auth.users where email = 'employer@wemuste.local'`);
  const company = psql(
    `select company_name from public.employer_profiles where user_id = '${sponsorId}'`,
  );
  psql(
    `insert into public.jobs (employer_id, title, description, location_label, lat, lng, status)
     values ('${sponsorId}', '${jobTitle}', 'Helps in a busy kitchen.', 'Lahore', 31.52, 74.35, 'pending')`,
  );
  const jobId = psql(`select id from public.jobs where title = '${jobTitle}'`);
  try {
    await loginAsAdmin(page);
    await page.goto("/admin/questions");
    await expect(page.getByRole("heading", { name: "Question builder", level: 1 })).toBeVisible();
    await page.getByLabel("Job title").fill(title);
    await page
      .getByLabel("Job description")
      .fill("Prepares and cooks meals on the line in a busy restaurant kitchen.");
    await page.getByRole("button", { name: "Generate questions" }).click();

    // The AI got the job (and the key), never any personal data.
    await expect(page.getByRole("heading", { name: "Review and edit" })).toBeVisible({
      timeout: 30_000,
    });
    const sent = requests.at(-1)!;
    expect(sent.key).toBe("e2e-anthropic-key-0123456789abcdef");
    expect(sent.body).toContain(title);
    expect(sent.body).not.toContain("employer@wemuste.local");

    // 25 test questions and 7 videos in the pattern; the admin edits one.
    await expect(page.getByLabel("Question 25")).toContainText("We Must E.");
    await expect(page.getByLabel("Video 2")).toContainText(`working as a ${title}`);
    await expect(page.getByText("Section 3 · Engage — the standard survey")).toBeVisible();
    await page
      .getByLabel("Video 4")
      .fill("Skills & Tools\n\n“Which knives and stoves have you worked with?”");
    await page.getByRole("button", { name: "Save questions" }).click();
    await expect(page).toHaveURL(/\/admin\/questions\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
    const build = psql(
      `select test_id || '|' || video_set_id from public.question_builds where title = '${title}'`,
    );
    const [testId, setId] = build.split("|");
    expect(psql(`select count(*) from public.test_questions where test_id = '${testId}'`)).toBe(
      "25",
    );
    expect(
      psql(`select prompt from public.video_questions where set_id = '${setId}' and position = 3`),
    ).toContain("knives and stoves");

    // Connect: the sponsor, then their job waiting for approval.
    const sponsor = page.getByLabel("Sponsor");
    await expect(sponsor.locator(`option[value="${sponsorId}"]`)).toContainText(company);
    await sponsor.selectOption(sponsorId);
    const row = page.locator(`[data-job="${jobId}"]`);
    await row.getByRole("button", { name: "Connect" }).click();
    const dialog = page.locator("dialog[open]");
    await expect(dialog).toContainText(`“${jobTitle}” will use these Exam and Execute questions`);
    await dialog.getByRole("button", { name: "Connect" }).click();
    await expect(page.getByText("Connected. The job now uses these questions.")).toBeVisible();
    await expect(row.getByText("Already uses these questions")).toBeVisible();
    expect(
      psql(`select test_id || '|' || video_set_id from public.jobs where id = '${jobId}'`),
    ).toBe(build);
    await expect(
      page.getByRole("listitem").filter({ hasText: jobTitle }).getByText("Waiting for approval"),
    ).toBeVisible();
  } finally {
    psql(`delete from public.jobs where id = '${jobId}'`);
    psql(
      `delete from public.tests where id in (select test_id from public.question_builds where title = '${title}')`,
    );
    psql(`delete from public.video_question_sets where title like 'Builder — ${title}%'`);
  }
});
