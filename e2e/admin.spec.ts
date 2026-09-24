import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./admin-session";
import { unique } from "./helpers";

const psql = (sql: string) =>
  execFileSync("docker", [
    "exec",
    "supabase_db_we_must_e",
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-Atqc",
    sql,
  ])
    .toString()
    .trim();

test("admin reviews a job seeker, grants access, edits content, moderates jobs, reads the audit log", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const name = `Review Candidate ${unique()}`;
  const email = `review${unique()}@example.test`;
  const surveyQ = `Do you have a UAE driving licence? ${unique()}`;
  const testQ = `Which is safer when lifting boxes? ${unique()}`;

  // A job seeker waiting for review, with one video to check (local DB only).
  const id = psql(`
    insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, raw_app_meta_data, email_confirmed_at)
    values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', '${email}',
            '{"full_name":"${name}","consents":{"terms":"1","privacy":"1","data_sharing":"1"}}', '{}', now())
    returning id;`).split("\n")[0];
  psql(`
    update public.employee_profiles set status = 'submitted', headline = 'Warehouse picker', city_emirate = 'Dubai',
      languages = '{English}', availability = '{weekends}', skills = '{Warehouse}' where user_id = '${id}';
    insert into public.video_resumes (employee_id, prompt_id, storage_path, duration_seconds)
      select '${id}', id, '${id}/' || gen_random_uuid() || '.webm', 20 from public.video_prompts where is_active order by position limit 1;`);

  await loginAsAdmin(page);
  const nav = page.getByRole("navigation", { name: "Admin" });
  await expect(page.getByText(/profiles? waiting for review/)).toBeVisible();

  // --- Review: approve the video and the profile ---
  await nav.getByRole("link", { name: "Job seekers", exact: true }).click();
  await page.getByLabel("Search name, headline or skill").fill(name);
  await page.getByRole("button", { name: "Filter" }).click();
  await expect(page.getByText("1 job seeker")).toBeVisible();
  await page.getByRole("link", { name: new RegExp(name) }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page.getByText("Waiting for review")).toBeVisible();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByText("Approved", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Approve profile" }).click();
  await expect(page.getByRole("button", { name: "Hide" })).toBeVisible();
  expect(psql(`select status from public.employee_profiles where user_id = '${id}'`)).toBe(
    "approved",
  );
  expect(psql(`select status from public.video_resumes where employee_id = '${id}'`)).toBe(
    "approved",
  );

  // --- Grant an employer access to this job seeker ---
  await nav.getByRole("link", { name: "Access", exact: true }).click();
  await page.getByRole("link", { name: "New grant" }).click();
  await page.getByLabel("Employer").selectOption({ label: "Sample Cafe Group" });
  await page.getByLabel("Search name, headline or skill").fill(name);
  await page.getByRole("checkbox", { name: new RegExp(name) }).check();
  await page.getByRole("button", { name: "Grant access" }).click();
  await expect(page).toHaveURL(/\/admin\/grants$/);
  await expect(page.getByRole("link", { name })).toBeVisible();

  // --- Content: add, reorder and delete a survey question ---
  await nav.getByRole("link", { name: "Content", exact: true }).click();
  await page.getByRole("link", { name: /\[SAMPLE\] Work preferences/ }).click();
  await page.getByRole("button", { name: "Add question" }).click();
  await page.getByLabel("Question").fill(surveyQ);
  await page.getByPlaceholder("Answer 1").fill("Yes");
  await page.getByPlaceholder("Answer 2").fill("No");
  await page.getByRole("button", { name: "Save" }).last().click();
  const added = page.getByRole("listitem").filter({ hasText: surveyQ });
  await expect(added).toBeVisible();
  await added.getByRole("button", { name: "Move up" }).click();
  await expect(page.locator("main ol > li").nth(2)).toContainText(surveyQ);
  page.once("dialog", (d) => d.accept());
  await added.getByRole("button", { name: "Delete" }).click();
  await expect(added).toHaveCount(0);

  // --- Test builder: a question needs a correct answer ---
  await nav.getByRole("link", { name: "Content", exact: true }).click();
  await page.getByRole("link", { name: /\[SAMPLE\] Basic workplace test/ }).click();
  await page.getByRole("button", { name: "Add question" }).click();
  await page.getByLabel("Question").fill(testQ);
  await page.getByPlaceholder("Answer 1").fill("Bend your knees");
  await page.getByPlaceholder("Answer 2").fill("Bend your back");
  await page.getByRole("button", { name: "Save" }).last().click();
  await expect(page.getByText("Mark the correct answer.")).toBeVisible();
  await page.getByRole("button", { name: "Mark as the correct answer" }).first().click();
  await page.getByRole("button", { name: "Save" }).last().click();
  await expect(
    page.getByRole("listitem").filter({ hasText: testQ }).getByText("✓ Bend your knees"),
  ).toBeVisible();
  // Leave the sample test as it was.
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("listitem")
    .filter({ hasText: testQ })
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(page.getByRole("listitem").filter({ hasText: testQ })).toHaveCount(0);

  // --- Jobs: remove from the map, then restore ---
  await nav.getByRole("link", { name: "Jobs", exact: true }).click();
  const job = page.getByRole("listitem").filter({ hasText: "[SAMPLE] Nail technician" });
  page.once("dialog", (d) => d.accept());
  await job.getByRole("button", { name: "Remove from map" }).click();
  await expect(job.getByText("Removed by Wemuste")).toBeVisible();
  await job.getByRole("button", { name: "Restore" }).click();
  await expect(job.getByText("Live")).toBeVisible();

  // --- Audit log ---
  await nav.getByRole("link", { name: "Audit log", exact: true }).click();
  await page.getByLabel("All actions").selectOption("video.status_changed");
  await page.getByRole("button", { name: "Filter" }).click();
  await expect(page.getByRole("cell", { name: /Local Admin \(admin\)/ }).first()).toBeVisible();
  await expect(page.getByRole("cell", { name: "video.status_changed" }).first()).toBeVisible();
});
