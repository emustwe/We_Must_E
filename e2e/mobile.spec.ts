import { expect, test, type Page } from "@playwright/test";
import { loginAsAdmin } from "./admin-session";
import { psql, removeObjects } from "./db";
import { acceptConfirms, answerAll, login, signOut, unique } from "./helpers";
import { PHONE, seedApplication } from "./seed-application";

// Every page must fit a small phone (360 px wide): nothing may stick out
// sideways. A screenshot of each page is kept in test-results for review.
test.use({ viewport: { width: 360, height: 740 } });

async function stubMap(page: Page) {
  await page.route("https://api.maptiler.com/**", (route) => route.fulfill({ status: 204 }));
}

async function expectFits(page: Page, name: string) {
  await page.waitForLoadState("networkidle").catch(() => {});
  const overflow = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const wide = [...document.querySelectorAll("body *")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        // Ignore things that are meant to scroll or be hidden.
        const clipped = el.closest(
          ".leaflet-container, [data-scroll-x], .overflow-x-auto, .overflow-hidden",
        );
        return r.width > 0 && r.right > width + 1 && !clipped && style.position !== "fixed";
      })
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`);
    return { scroll: document.documentElement.scrollWidth - width, wide };
  });
  // Very long pages are captured at screen height (the check above covers the whole page).
  const tall = await page.evaluate(
    () => document.documentElement.scrollHeight * devicePixelRatio > 14000,
  );
  await page
    .screenshot({ path: test.info().outputPath(`${name}.png`), fullPage: !tall })
    .catch(() => {}); // screenshots are for people reviewing the run; the check above decides

  expect(overflow, `${name} is wider than the phone`).toEqual({ scroll: 0, wide: [] });
}

test("public pages fit a small phone", async ({ page }) => {
  test.setTimeout(120_000);
  await stubMap(page);
  const job = psql(`select id from public.jobs where title = '[SAMPLE] Weekend barista'`);
  for (const [name, path] of [
    ["map", "/"],
    ["job-sheet", `/?job=${job}`],
    ["apply-start", `/apply/${job}`],
    ["apply-sent", `/apply/${job}/submitted`],
    ["for-sponsors", "/for-sponsors"],
    ["privacy", "/privacy"],
    ["terms", "/terms"],
    ["login", "/login"],
    ["forgot-password", "/forgot-password"],
    ["not-found", "/this-page-does-not-exist"],
  ]) {
    await page.goto(path);
    await expectFits(page, name);
  }
  await page.goto("/");
  await expectFits(page, "map");
});

test("the application steps fit a small phone", async ({ page }) => {
  test.setTimeout(120_000);
  await acceptConfirms(page);
  const job = psql(`select id from public.jobs where title = '[SAMPLE] Office cleaner (mornings)'`);
  try {
    await page.goto(`/apply/${job}`);
    await page.getByRole("button", { name: "Start application" }).click();
    await page.getByRole("button", { name: "Start the test" }).click();
    await expect(page.getByText("0 of 3 answered")).toBeVisible();
    await expectFits(page, "apply-test");
    await answerAll(page);
    await page.getByRole("button", { name: "Finish test" }).click();
    await expect(page.getByRole("heading", { name: "Task" })).toBeVisible();
    await expectFits(page, "apply-task");
    // Skip to the survey without recording (the flow itself is covered in apply.spec).
    psql(`update public.applications set current_step = 'survey' where job_id = '${job}'
          and status = 'in_progress'`);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Survey" })).toBeVisible();
    await expectFits(page, "apply-survey");
  } finally {
    psql(`delete from public.applications where job_id = '${job}'`);
  }
});

test("sponsor pages fit a small phone", async ({ page }) => {
  test.setTimeout(120_000);
  await stubMap(page);
  await login(page, "employer@wemuste.local");
  await expect(page).toHaveURL(/\/sponsor$/);
  const job = psql(`select id from public.jobs where title = '[SAMPLE] Weekend barista'`);
  for (const [name, path] of [
    ["sponsor-jobs", "/sponsor"],
    ["sponsor-new-job", "/sponsor/jobs/new"],
    ["sponsor-job", `/sponsor/jobs/${job}`],
    ["sponsor-edit-job", `/sponsor/jobs/${job}/edit`],
    ["sponsor-account", "/sponsor/account"],
  ]) {
    await page.goto(path);
    await expectFits(page, name);
  }
  await signOut(page);
});

test("admin pages fit a small phone", async ({ page }) => {
  test.setTimeout(180_000);
  await stubMap(page);
  const { appId, paths } = await seedApplication(`Mobile Check ${unique()}`);
  try {
    await loginAsAdmin(page);
    const sponsor = psql(
      `select user_id from public.employer_profiles where contact_email = 'employer@wemuste.local'`,
    );
    const testId = psql(`select id from public.tests limit 1`);
    const surveyId = psql(`select id from public.surveys limit 1`);
    const setId = psql(`select id from public.video_question_sets limit 1`);
    for (const [name, path] of [
      ["admin-home", "/admin"],
      ["admin-applications", "/admin/applications"],
      ["admin-application", `/admin/applications/${appId}`],
      ["admin-sponsors", "/admin/sponsors"],
      ["admin-sponsor", `/admin/sponsors/${sponsor}`],
      ["admin-new-sponsor", "/admin/sponsors/new"],
      ["admin-jobs", "/admin/jobs"],
      ["admin-content", "/admin/content"],
      ["admin-test-editor", `/admin/content/tests/${testId}`],
      ["admin-survey-editor", `/admin/content/surveys/${surveyId}`],
      ["admin-video-set", `/admin/content/videos/${setId}`],
      ["admin-audit", "/admin/audit"],
    ]) {
      await page.goto(path);
      await expectFits(page, name);
    }
  } finally {
    await removeObjects("application-videos", paths);
    psql(`delete from public.applicants where phone_e164 = '${PHONE}'`);
  }
});

// The map must never draw over the sticky header/menu while scrolling, and
// pop-ups (search results, city list, job sheet) must sit above the map.
async function expectOnTop(page: Page, selector: string, label: string) {
  const onTop = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return "missing";
    if (el.tagName !== "HEADER" && el.tagName !== "NAV") el.scrollIntoView({ block: "nearest" });
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, 20));
    return hit && (el === hit || el.contains(hit)) ? "ok" : `covered by ${hit?.className}`;
  }, selector);
  expect(onTop, `${label} is covered`).toBe("ok");
}

test("maps stay under menus and pop-ups on a phone", async ({ page }) => {
  test.setTimeout(150_000);
  await page.route("https://api.maptiler.com/**", (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith("/geocoding/")) return route.fulfill({ status: 204 });
    return route.fulfill({
      json: {
        features: [
          {
            place_name: "Dubai Marina, Dubai, United Arab Emirates",
            center: [55.1403, 25.0805],
            properties: { country_code: "ae" },
            context: [{ id: "country.1", text: "United Arab Emirates", country_code: "ae" }],
          },
        ],
      },
    });
  });

  // Public map: search results and the job sheet.
  await page.goto("/");
  await page.getByRole("combobox", { name: "City or area" }).fill("Marina");
  await expect(page.getByRole("option").first()).toBeVisible();
  await expectOnTop(page, '[role="listbox"]', "public search results");
  await page.screenshot({ path: test.info().outputPath("map-search.png") });
  await page.keyboard.press("Escape");
  const barista = psql(`select id from public.jobs where title = '[SAMPLE] Weekend barista'`);
  await page.goto(`/?job=${barista}`);
  await expectOnTop(page, '[aria-labelledby="wm-job-title"]', "job sheet");
  await page.screenshot({ path: test.info().outputPath("map-sheet.png") });

  // Sponsor job form: place-search results over the picker map; header over the map.
  await login(page, "employer@wemuste.local");
  await expect(page).toHaveURL(/\/sponsor$/);
  await page.goto("/sponsor/jobs/new");
  await page.getByRole("combobox", { name: "Search a place or area" }).fill("Marina");
  await expect(page.getByRole("option").first()).toBeVisible();
  await expectOnTop(page, '[role="listbox"]', "place search results over the picker map");
  await page.keyboard.press("Escape");
  await page.locator(".leaflet-container").scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    const map = document.querySelector(".leaflet-container")!;
    window.scrollBy(0, map.getBoundingClientRect().top - 40);
  });
  await expectOnTop(page, "header", "sponsor header over the picker map");
  await page.screenshot({ path: test.info().outputPath("sponsor-form-scrolled.png") });
  await signOut(page);

  // Admin jobs map under the sticky header and menu.
  await loginAsAdmin(page);
  await page.goto("/admin/jobs");
  await page.locator(".leaflet-container").waitFor();
  await page.evaluate(() => {
    const map = document.querySelector(".leaflet-container")!;
    window.scrollBy(0, map.getBoundingClientRect().top - 60);
  });
  await expectOnTop(page, '[aria-label="Open menu"]', "admin top bar over the jobs map");
  await page.screenshot({ path: test.info().outputPath("admin-jobs-scrolled.png") });
});
