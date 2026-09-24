import { expect, test } from "@playwright/test";
import { createUser, psql, uploadObject } from "./db";
import { login, signOut, unique } from "./helpers";

const PASSWORD = "Candidate-Pass-2026!";

test("employer views a granted candidate, plays a logged video, and books a meeting", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const name = `Granted Candidate ${unique()}`;
  const email = `granted${unique()}@example.test`;

  // --- Setup: approved job seeker with a stored video, a test score and an admin grant ---
  const id = createUser(email, PASSWORD, {
    full_name: name,
    consents: { terms: "1", privacy: "1", data_sharing: "1" },
  });
  const path = `${id}/${crypto.randomUUID()}.webm`;
  await uploadObject(
    "video-resumes",
    path,
    new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0]),
    "video/webm",
  );
  psql(`
    update public.employee_profiles set status = 'approved', headline = 'Forklift driver, 5 years', city_emirate = 'Sharjah',
      languages = '{English,Hindi}', skills = '{Forklift}', availability = '{full_time}' where user_id = '${id}';
    update public.employee_contacts set phone = '+971 55 333 4444' where user_id = '${id}';
    insert into public.video_resumes (employee_id, prompt_id, storage_path, duration_seconds, status)
      select '${id}', id, '${path}', 30, 'approved' from public.video_prompts where is_active order by position limit 1;
    insert into public.test_attempts (employee_id, test_id, submitted_at, score)
      select '${id}', id, now(), 80 from public.tests where is_active;
    insert into public.access_grants (employer_id, employee_id, scopes, note)
      values ('10000000-0000-0000-0000-000000000002', '${id}', '{profile,test,video,contact}', 'e2e');`);

  // --- Employer: candidates list → detail with the granted sections ---
  await login(page, "employer@wemuste.local");
  await expect(page).toHaveURL(/\/employer$/);
  await page
    .getByRole("navigation", { name: "Employer" })
    .getByRole("link", { name: "Candidates" })
    .click();
  await page
    .getByRole("link", { name: /Forklift driver, 5 years/ })
    .first()
    .click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page.getByText("80%").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Call" })).toHaveAttribute(
    "href",
    "tel:+971553334444",
  );
  // No `cv` or `survey` scope: those sections are absent.
  await expect(page.getByRole("heading", { name: "CV" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Survey answers" })).toHaveCount(0);

  // Video: a 5-minute signed link only after tapping Play.
  await expect(page.locator("video")).toHaveCount(0);
  await page.getByRole("button", { name: "Play video" }).click();
  await expect(page.locator("video")).toHaveAttribute(
    "src",
    /\/storage\/v1\/object\/sign\/video-resumes\/.+token=/,
  );

  const logged =
    psql(`select string_agg(distinct metadata->>'scope', ',' order by metadata->>'scope') from public.audit_logs
                        where action = 'candidate.viewed' and target_id = '${id}'`);
  expect(logged).toBe("profile,video");

  // --- Meeting request with one proposed time (tomorrow 10:00 local) ---
  const tomorrow = new Date(Date.now() + 86_400_000);
  const local = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}T10:00`;
  await page.getByRole("button", { name: "Request a meeting" }).click();
  await page.getByLabel("Time 1").fill(local);
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByText("Meeting request sent.")).toBeVisible();
  await expect(page.getByText("Waiting for reply")).toBeVisible();
  await signOut(page);

  // --- Job seeker: pick the time ---
  await login(page, email, PASSWORD);
  await expect(page).toHaveURL(/\/employee$/);
  await page.getByRole("link", { name: "Requests" }).click();
  await expect(page.getByRole("heading", { name: "Meeting invites" })).toBeVisible();
  await page.getByRole("button", { name: /Pick this time/ }).click();
  await expect(page.getByText("The employer hasn't added the link yet.")).toBeVisible();
  await page.getByRole("link", { name: "Profile", exact: true }).click();
  await signOut(page);

  // --- Employer: add the meeting link ---
  await login(page, "employer@wemuste.local");
  await expect(page).toHaveURL(/\/employer$/);
  await page
    .getByRole("navigation", { name: "Employer" })
    .getByRole("link", { name: "Meetings" })
    .click();
  const card = page.getByRole("listitem").filter({ hasText: name });
  await expect(card.getByText("Accepted")).toBeVisible();
  await card.getByLabel("Meeting link").fill("http://not-secure.example");
  await card.getByRole("button", { name: "Save link" }).click();
  await expect(page.getByText("Paste a full link starting with https://")).toBeVisible();
  await card.getByLabel("Meeting link").fill("https://meet.google.com/abc-defg-hij");
  await card.getByRole("button", { name: "Save link" }).click();
  await expect(page.getByText("Link saved.")).toBeVisible();

  // --- An employer without access gets a 404 for someone else ---
  const stranger = psql(
    `select user_id from public.employee_profiles where user_id <> '${id}' and status = 'draft' limit 1`,
  );
  const res = await page.goto(`/employer/candidates/${stranger}`);
  expect(res!.status()).toBe(404);
  await page.goto("/employer");
  await signOut(page);

  // --- Job seeker sees the join link ---
  await login(page, email, PASSWORD);
  await expect(page).toHaveURL(/\/employee$/);
  await page.getByRole("link", { name: "Requests" }).click();
  await expect(page.getByRole("link", { name: "Join meeting" })).toHaveAttribute(
    "href",
    "https://meet.google.com/abc-defg-hij",
  );
});
