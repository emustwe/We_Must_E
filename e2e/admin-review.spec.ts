import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./admin-session";
import { psql, removeObjects } from "./db";
import { JOB, PHONE, seedApplication } from "./seed-application";
import { unique } from "./helpers";

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
