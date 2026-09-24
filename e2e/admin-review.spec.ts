import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./admin-session";
import { psql, removeObjects, uploadObject } from "./db";
import { unique } from "./helpers";

const JOB = "[SAMPLE] Evening cashier";
const TOKEN = "e2e-review-token-0123456789-0123456789";
const PHONE = "+971502223344";
const WEBM = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01]);

// Builds a submitted application through the same database functions the
// public server module uses (the apply UI itself is covered in apply.spec).
async function seedApplication(name: string) {
  const job = psql(`select id from public.jobs where title = '${JOB}'`);
  const q = (sql: string) =>
    psql(sql.replaceAll("$JOB", `'${job}'`).replaceAll("$TOK", `'${TOKEN}'`));
  q(`select public.app_start($JOB, $TOK, 'ip')`);
  q(`select public.app_start_test($JOB, $TOK)`);
  q(
    `select public.app_save_test_answer($JOB, $TOK, '20000000-0000-0000-0000-000000000003', '{"options":[1]}')`,
  );
  q(
    `select public.app_save_test_answer($JOB, $TOK, '20000000-0000-0000-0000-000000000004', '{"options":[0]}')`,
  );
  q(
    `select public.app_save_test_answer($JOB, $TOK, '20000000-0000-0000-0000-000000000005', '{"text":"I love serving people"}')`,
  );
  q(`select public.app_submit_test($JOB, $TOK)`);
  const appId = q(`select id from public.applications where draft_token_hash = $TOK`);
  const videoQuestions = q(
    `select id from public.video_questions where set_id = (select video_set_id from public.applications where id = '${appId}') order by position`,
  ).split("\n");
  const paths: string[] = [];
  for (const vq of videoQuestions) {
    const path = `${appId}/${vq}/answer.webm`;
    await uploadObject("application-videos", path, WEBM, "video/webm");
    q(
      `select public.app_record_video($JOB, $TOK, '${vq}', '${path}', 12, ${WEBM.length}, 'video/webm')`,
    );
    paths.push(path);
  }
  q(`select public.app_finish_videos($JOB, $TOK)`);
  q(`select public.app_submit($JOB, $TOK, '${name}', '${PHONE}', '', (
       select jsonb_object_agg(id::text, case type
         when 'single_choice' then '{"options":[0]}'::jsonb
         when 'multi_choice' then '{"options":[0,1]}'::jsonb
         else '{"text":"Latte art"}'::jsonb end)
       from public.survey_questions where survey_id = (select survey_id from public.applications where id = '${appId}')),
     'v1', 'ip', true)`);
  return { appId, paths };
}

test("an admin reviews an application: marks, grading, logged video views, approval", async ({
  page,
}) => {
  test.setTimeout(120_000);
  page.on("dialog", (dialog) => dialog.accept());
  const name = `Omar Review ${unique()}`;
  const { appId, paths } = await seedApplication(name);

  try {
    await loginAsAdmin(page);
    await page
      .getByRole("navigation", { name: "Admin" })
      .getByRole("link", { name: "Applications" })
      .click();
    await expect(page.getByRole("heading", { name: "Applications", exact: true })).toBeVisible();

    // Filters: by job and minimum score (1 of 3 choice points so far = 33%).
    await page.getByLabel("Job", { exact: true }).selectOption({ label: JOB });
    await page.getByLabel("Minimum score (%)").fill("50");
    await page.getByRole("button", { name: "Filter" }).click();
    await expect(page.getByText(name)).toHaveCount(0);
    await page.getByLabel("Minimum score (%)").fill("30");
    await page.getByRole("button", { name: "Filter" }).click();
    await page.getByRole("link", { name: new RegExp(name) }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/applications/${appId}`));
    await expect(page.getByRole("heading", { name })).toBeVisible();
    await expect(page.getByText(PHONE)).toBeVisible();
    await expect(page.getByText("33.3%")).toBeVisible();

    // Test tab: right/wrong markers, then grade the written answer.
    await expect(page.getByText("Their answer")).toHaveCount(2);
    await expect(page.getByText("Needs grading")).toBeVisible();
    await page.getByLabel("Points (out of 1)").fill("1");
    await page.getByRole("button", { name: "Save grade" }).click();
    await expect(page.getByText("66.7%")).toBeVisible();

    // Video tab: a short-lived link, and the view is logged.
    await page.getByRole("link", { name: "Video" }).click();
    await page
      .getByRole("button", { name: /Play video/ })
      .first()
      .click();
    const video = page.locator("video").first();
    await expect(video).toHaveAttribute("src", /\/storage\/v1\/object\/sign\/application-videos\//);
    expect(
      psql(
        `select count(*) from public.audit_logs where action = 'application.video_viewed' and target_id = '${appId}'`,
      ),
    ).toBe("1");

    // Survey tab shows the answers.
    await page.getByRole("link", { name: "Survey" }).click();
    await expect(page.getByText("Latte art")).toBeVisible();

    // Approve with notes.
    await page.getByLabel("Notes").fill("Friendly, good answers.");
    await page.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText("Approved", { exact: true }).first()).toBeVisible();
    expect(
      psql(`select status || '|' || admin_notes from public.applications where id = '${appId}'`),
    ).toBe("approved|Friendly, good answers.");

    // The audit log links back to the application.
    await page.goto("/admin/audit?action=application.reviewed");
    await expect(
      page.getByRole("link", { name: "application", exact: true }).first(),
    ).toHaveAttribute("href", `/admin/applications/${appId}`);
  } finally {
    await removeObjects("application-videos", paths);
    psql(`delete from public.applicants where phone_e164 = '${PHONE}'`);
  }
});
