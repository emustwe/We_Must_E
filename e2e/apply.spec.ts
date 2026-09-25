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

// A 2-second WebM made in the browser (a canvas video), used as a file the
// visitor "picks from their phone".
async function makeVideoFile(page: Page) {
  const base64 = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext("2d")!;
    const stream = canvas.captureStream(15);
    const rec = new MediaRecorder(stream, { mimeType: "video/webm" });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    let frame = 0;
    const timer = setInterval(() => {
      ctx.fillStyle = `hsl(${(frame += 12) % 360} 70% 50%)`;
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
  page.on("dialog", (dialog) => dialog.accept());
  const since = new Date(Date.now() - 1000);
  const id = jobId();

  await page.goto(`/?job=${id}`);
  await page.getByRole("link", { name: "Apply" }).click();
  await expect(page).toHaveURL(new RegExp(`/apply/${id}$`));
  await page.getByRole("button", { name: "Start application" }).click();

  // --- Test (timed on the server). One question per screen; answers autosave.
  await expect(page.getByText("Step 1 of 3 · Quick test")).toBeVisible();
  await page.getByRole("button", { name: "Start the test" }).click();
  await expect(page.getByText("Question 1 of 3")).toBeVisible();
  await expect(page.getByText("Time left")).toBeAttached(); // the timer
  await page.getByText("Listen and apologise").click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Question 2 of 3")).toBeVisible();

  // Reloading resumes where the visitor was, with the saved answer.
  await page.reload();
  await expect(page.getByText("Question 2 of 3")).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByRole("radio", { name: "Listen and apologise" })).toBeChecked();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await page.getByText("8:50").click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("Type your answer").fill("I enjoy helping people.");
  await page.getByRole("button", { name: "Finish test" }).click();

  // --- Video: two short answers with the fake camera.
  await expect(page.getByText("Step 2 of 3 · Short video")).toBeVisible();
  await expect(page.getByText("Video 1 of 2")).toBeVisible();
  await recordAnswer(page);
  await expect(page.getByText("Video 2 of 2")).toBeVisible({ timeout: 20_000 });
  // The second answer is a video picked from the phone instead.
  await page.getByLabel("Upload a video from my phone").setInputFiles(await makeVideoFile(page));
  await expect(page.locator("video[controls]")).toBeVisible();
  await page.getByRole("button", { name: "Use this video" }).click();
  await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled({ timeout: 20_000 });
  await page.getByRole("button", { name: "Continue" }).click();

  // --- Survey: contact details, questions, consent (never pre-ticked).
  await expect(page.getByText("Step 3 of 3 · About you")).toBeVisible();
  await page.getByLabel("Full name").fill("Sara Ahmed");
  await page.getByLabel("Phone number").fill("12");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Please enter a valid phone number")).toBeVisible();
  await page.getByLabel("Phone number").fill("050 111 2233");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Please answer this question.")).toBeVisible();
  await page.getByText("This week").click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByText("Retail").click();
  await page.getByText("Delivery").click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click(); // optional question
  const consent = page.getByRole("checkbox", {
    name: /I agree that Wemuste stores my information/,
  });
  await expect(consent).not.toBeChecked();
  await page.getByRole("button", { name: "Send application" }).click();
  await expect(page.getByText("Please tick the box to agree before sending.")).toBeVisible();
  await page.getByText(/I agree that Wemuste stores my information/).click();
  await page.getByRole("button", { name: "Send application" }).click();

  await expect(page).toHaveURL(new RegExp(`/apply/${id}/submitted$`));
  await expect(page.getByRole("heading", { name: "Application sent" })).toBeVisible();
  await expect(page.getByText("We'll contact you if you're shortlisted.")).toBeVisible();

  // Stored once, graded on the server, with both videos in private storage.
  const row = psql(
    `select a.status || '|' || a.test_score || '|' || a.test_max_score || '|' || p.phone_e164 || '|' ||
            (select count(*) from public.application_videos v where v.application_id = a.id) || '|' ||
            (select count(*) from storage.objects o where o.bucket_id = 'application-videos'
               and o.name like a.id || '/%') || '|' || (a.draft_token_hash is null)
       from public.applications a join public.applicants p on p.id = a.applicant_id
      where a.job_id = '${id}'`,
  );
  expect(row).toBe("submitted|2.00|3.00|+971501112233|2|2|true");

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
