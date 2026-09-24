import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { enterSignupCode, unique } from "./helpers";

const PASSWORD = "Tulip-Harbor-Vessel-92";

// A new job seeker goes from signup to their first job request.
test("onboarding: basics → survey → test → video → CV → submit → request a job", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const email = `onboard${unique()}@example.test`;

  await page.goto("/signup/employee");
  await page.getByLabel("Full name").fill("Aisha Rahman");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("checkbox", { name: /I agree to the/ }).check();
  await page.getByRole("checkbox", { name: /stored privately/ }).check();
  const since = new Date(Date.now() - 1000);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/verify-email$/);
  await enterSignupCode(page, email, since);
  // New job seekers start in the wizard; the map also nudges unfinished profiles.
  await expect(page).toHaveURL(/\/employee\/onboarding\/basics$/);
  await page.goto("/employee");
  await page.getByRole("link", { name: /Finish your profile to send job requests/ }).click();
  await expect(page).toHaveURL(/\/employee\/onboarding\/basics$/);
  await expect(page.getByText("Step 1 of 6")).toBeVisible();

  // --- Basics (validation first) ---
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Pick at least one language.")).toBeVisible();
  await page.getByLabel("What kind of work do you do?").fill("Cashier and waitress, 2 years");
  await page.getByLabel("Where do you live?").selectOption("Dubai");
  await page.getByRole("button", { name: "English" }).click();
  await page.getByRole("button", { name: "Urdu" }).click();
  await page.getByRole("button", { name: "Cashier" }).click();
  await page.getByLabel("Add a skill").fill("Latte art");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("button", { name: "Latte art" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Evenings" }).click();
  await page.getByLabel("Phone number").fill("+971 55 111 2222");
  await page.getByRole("button", { name: "Continue" }).click();

  // --- Survey: one question per screen, required answers enforced ---
  await expect(page).toHaveURL(/\/onboarding\/survey$/);
  await page.getByRole("button", { name: "Start the survey" }).click();
  await expect(page.getByText("Question 1 of 3")).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Please answer this question.")).toBeVisible();
  await page.getByRole("radio", { name: "This week" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Question 2 of 3")).toBeVisible();
  await page.getByRole("checkbox", { name: "Retail" }).click();
  await page.getByRole("checkbox", { name: "Hospitality" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  // Optional question: can be left empty.
  await expect(page.getByText("Question 3 of 3")).toBeVisible();
  await page.getByRole("button", { name: "Finish survey" }).click();

  // --- Timed test ---
  await expect(page).toHaveURL(/\/onboarding\/test$/);
  await expect(page.getByText(/2 questions · 5 minutes/)).toBeVisible();
  await page.getByRole("button", { name: "Start the test" }).click();
  await expect(page.getByRole("timer")).toContainText(/[45]:\d\d/);
  await page.getByRole("radio", { name: /Listen and apologise/ }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("radio", { name: /8:50/ }).click();
  // Every answer must save (no error shown) before submitting.
  await expect(page.locator("main [role=alert]").filter({ hasText: /./ })).toHaveCount(0);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Submit test" }).click();

  // Graded on the server: both sample answers were correct.
  const score = execFileSync("docker", [
    "exec",
    "supabase_db_we_must_e",
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-Atc",
    `select score from public.test_attempts a join auth.users u on u.id = a.employee_id where u.email = '${email}'`,
  ])
    .toString()
    .trim();
  expect(score).toBe("100.00");

  // --- Video answers with the fake camera ---
  await expect(page).toHaveURL(/\/onboarding\/video$/);
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: "Record", exact: true }).first().click();
    await page.getByRole("button", { name: "Start recording" }).click();
    await expect(page.getByText("Recording", { exact: true })).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Stop" }).click();
    await page.getByRole("button", { name: "Use this video" }).click();
    await expect(page.getByRole("button", { name: "Record again" }).nth(i)).toBeVisible({
      timeout: 30_000,
    });
  }
  await page.getByRole("link", { name: "Continue" }).click();

  // --- CV: a disguised file is rejected, a real PDF is accepted ---
  await expect(page).toHaveURL(/\/onboarding\/cv$/);
  await page.getByLabel("Choose a file").setInputFiles({
    name: "cv.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("<html><script>alert(1)</script></html>"),
  });
  await expect(page.getByText(/That file didn't work/)).toBeVisible();
  await page.getByLabel("Choose a file").setInputFiles({
    name: "cv.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"),
  });
  await expect(page.getByText("CV uploaded")).toBeVisible();
  await page.getByRole("link", { name: "Continue" }).click();

  // --- Finish ---
  await expect(page).toHaveURL(/\/onboarding\/done$/);
  await page.getByRole("button", { name: "Finish and start requesting jobs" }).click();
  await expect(page.getByRole("heading", { name: /You're all set/ })).toBeVisible();
  await page.getByRole("link", { name: "Open the job map" }).click();

  // --- Now requests are allowed ---
  await expect(page).toHaveURL(/\/employee$/);
  await expect(
    page.getByRole("link", { name: /Finish your profile to send job requests/ }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: /\[SAMPLE\] Evening cashier/ })
    .first()
    .click();
  const sheet = page.getByRole("dialog", { name: "[SAMPLE] Evening cashier" });
  await sheet.getByRole("button", { name: "Send request" }).click();
  await expect(sheet.getByText("Request sent").first()).toBeVisible();
});
