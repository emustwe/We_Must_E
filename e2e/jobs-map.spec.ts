import { expect, test, type Page } from "@playwright/test";
import { loginAsAdmin } from "./admin-session";
import { psql } from "./db";
import { login, signOut, unique } from "./helpers";

// MapTiler is stubbed: tiles come back empty and place search returns one
// known result, so the tests never depend on the network or the API key.
async function stubMapTiler(page: Page) {
  await page.route("https://api.maptiler.com/**", (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith("/geocoding/")) return route.fulfill({ status: 204 });
    const reverse = /^\/geocoding\/-?[\d.]+,-?[\d.]+\.json$/.test(url.pathname);
    return route.fulfill({
      json: {
        features: [
          reverse
            ? { place_name: "Marina Walk, Dubai, United Arab Emirates", center: [55.1403, 25.0805] }
            : {
                place_name: "Dubai Marina, Dubai, United Arab Emirates",
                center: [55.1403, 25.0805],
              },
        ],
      },
    });
  });
}

async function openList(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Not now" }).click();
  await page.getByRole("button", { name: /^List ·/ }).click();
  return page.getByRole("region", { name: "All jobs" });
}

test.beforeEach(({ page }) => stubMapTiler(page));

test("anyone can browse live jobs on the map and open one, without an account", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Map of jobs" })).toBeVisible();
  // Pins (or clusters of pins) are on the map.
  await expect(page.locator(".wm-pin, .wm-cluster").first()).toBeVisible();
  // Location is blocked in this browser: the emirate picker is offered instead.
  await expect(page.getByRole("heading", { name: "Where are you looking?" })).toBeVisible();

  // Emirate fallback instead of location, then the distance filter works.
  await page.getByRole("button", { name: "Sharjah", exact: true }).click();
  await page.getByRole("button", { name: "5 km", exact: true }).click();
  await page.getByRole("button", { name: /^List ·/ }).click();
  const near = page.getByRole("region", { name: "All jobs" });
  await expect(near.getByRole("heading", { name: "Jobs near Sharjah" })).toBeVisible();
  await expect(near.getByText("[SAMPLE] Weekend barista")).toHaveCount(0);

  const list = await openList(page);
  await list.getByRole("button", { name: /\[SAMPLE\] Weekend barista/ }).click();
  const sheet = page.getByRole("region", { name: "[SAMPLE] Weekend barista" });
  await expect(sheet.getByText("Dubai Marina, Dubai")).toBeVisible();
  for (const line of ["Free to apply", "We never ask for money", "Your information is private"]) {
    await expect(sheet.getByText(line)).toBeVisible();
  }
  // The open job is in the URL, so it can be shared.
  await expect(page).toHaveURL(/\?job=[0-9a-f-]{36}$/);
  await sheet.getByRole("link", { name: "Apply" }).click();
  await expect(page).toHaveURL(/\/apply\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Apply in 3 short steps" })).toBeVisible();
  await expect(page.getByText("[SAMPLE] Weekend barista")).toBeVisible();

  // The public page never receives exact coordinates.
  const html = await (await page.request.get("/")).text();
  expect(html).not.toContain("25.0805,");
  expect(html).not.toContain("employer_id");
});

test("with location allowed, the nearest jobs come first", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 25.0805, longitude: 55.1403 }); // Dubai Marina
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Use my location" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^List ·/ })).toBeVisible();
  await page.getByRole("button", { name: "2 km", exact: true }).click();
  await page.getByRole("button", { name: /^List ·/ }).click();
  const list = page.getByRole("region", { name: "All jobs" });
  await expect(list.getByRole("heading", { name: "Jobs near You" })).toBeVisible();
  const first = list.getByRole("listitem").first();
  await expect(first).toContainText("[SAMPLE] Weekend barista");
  await expect(first).toContainText(/· 0\.\d km away/);
  await expect(list.getByText("[SAMPLE] Bike delivery rider")).toHaveCount(0);
});

test("an employer posts a job that appears on the map, and an admin can hide it", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const title = `Pop-up stall helper ${unique()}`;

  await login(page, "employer@wemuste.local");
  await expect(page).toHaveURL(/\/employer$/);
  await page.getByRole("link", { name: "Post a job" }).first().click();
  await page.getByLabel("Job title").fill(title);
  await page
    .getByLabel("Description")
    .fill("Help run our weekend stall: set up, serve and pack down.");
  await page.getByRole("combobox", { name: "Search a place or area" }).fill("Marina");
  await page.getByRole("option", { name: /Dubai Marina/ }).click();
  await expect(page.getByLabel("Place name")).toHaveValue("Dubai Marina, Dubai");
  await page.getByRole("button", { name: "Post job" }).click();
  await expect(page.getByText("Your job is live on the map.")).toBeVisible();
  await expect(page.getByText("Live", { exact: true })).toBeVisible();

  let list = await openList(page);
  await expect(list.getByRole("button", { name: new RegExp(title) })).toBeVisible();

  // Admin hides it: it leaves the public map.
  await page.goto("/employer");
  await signOut(page);
  await loginAsAdmin(page);
  await page.goto("/admin/jobs");
  const row = page.getByRole("listitem").filter({ hasText: title });
  await row.getByRole("button", { name: "Hide" }).click();
  await expect(row.getByText("Hidden by Wemuste")).toBeVisible();

  list = await openList(page);
  await expect(list.getByText("[SAMPLE] Weekend barista")).toBeVisible();
  await expect(list.getByRole("button", { name: new RegExp(title) })).toHaveCount(0);

  await psql(`delete from public.jobs where title = '${title}'`);
});
