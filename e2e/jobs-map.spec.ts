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
    const context = [
      { id: "place.1", text: "Dubai Marina" },
      { id: "region.2", text: "Dubai Emirate" },
      { id: "country.3", text: "United Arab Emirates", country_code: "ae" },
    ];
    return route.fulfill({
      json: {
        features: [
          {
            place_name: reverse
              ? "Marina Walk, Dubai, United Arab Emirates"
              : "Dubai Marina, Dubai, United Arab Emirates",
            center: [55.1403, 25.0805],
            properties: { country_code: "ae" },
            context,
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

// Jobs left behind by an earlier, interrupted run would change what's nearest.
test.beforeAll(() => {
  psql(
    `delete from public.jobs where title like 'Pop-up stall helper %' or title like 'Leaflet helper %'`,
  );
});

const sponsorName = psql(
  `select company_name from public.employer_profiles where contact_email = 'employer@wemuste.local'`,
);

test("anyone can browse live jobs on the map and open one, without an account", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Map of jobs" })).toBeVisible();
  // Job cards (or clusters of them) are on the map, with the sponsor's name.
  await expect(page.locator(".wm-card, .wm-cluster").first()).toBeVisible();
  // Location is blocked in this browser: a country picker is offered instead.
  await expect(page.getByRole("heading", { name: "Where are you looking?" })).toBeVisible();

  // Country, then city, filter the jobs.
  await page.getByRole("button", { name: "United Arab Emirates", exact: true }).click();
  await expect(page.getByLabel("Country", { exact: true })).toHaveValue("AE");
  // Any city can be searched; cities with jobs are listed.
  await page.getByRole("button", { name: /All cities/ }).click();
  const cities = page.getByRole("region", { name: "Cities in United Arab Emirates" });
  await expect(cities.getByRole("combobox", { name: "Search any city" })).toBeVisible();
  await cities.getByRole("button", { name: /^Sharjah/ }).click();
  await page.getByRole("button", { name: /^List ·/ }).click();
  const near = page.getByRole("region", { name: "All jobs" });
  await expect(near.getByRole("heading", { name: "Jobs in Sharjah" })).toBeVisible();
  await expect(near.getByText("[SAMPLE] Shop assistant")).toBeVisible();
  await expect(near.getByText("[SAMPLE] Weekend barista")).toHaveCount(0);

  const list = await openList(page);
  await list.getByRole("button", { name: /\[SAMPLE\] Weekend barista/ }).click();
  const sheet = page.getByRole("region", { name: "[SAMPLE] Weekend barista" });
  await expect(sheet.getByText(/Dubai Marina, Dubai, United Arab Emirates/)).toBeVisible();
  await expect(sheet.getByText(sponsorName, { exact: true })).toBeVisible();
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

test("a sponsor's job waits for approval, then appears live on an open map; hiding removes it live", async ({
  page,
  browser,
}) => {
  test.setTimeout(150_000);
  const title = `Pop-up stall helper ${unique()}`;

  await login(page, "employer@wemuste.local");
  await expect(page).toHaveURL(/\/sponsor$/);
  await page.getByRole("link", { name: "Post a job" }).first().click();
  await page.getByLabel("Job title").fill(title);
  await page
    .getByLabel("Description")
    .fill("Help run our weekend stall: set up, serve and pack down.");
  await page.getByRole("combobox", { name: "Search a place or area" }).fill("Marina");
  await page.getByRole("option", { name: /Dubai Marina/ }).click();
  await expect(page.getByLabel("Place name")).toHaveValue("Dubai Marina, Dubai");
  // Country and city come from the map; the sponsor can correct them.
  await expect(page.getByLabel("Country")).toHaveValue("AE");
  await expect(page.getByLabel("City")).toHaveValue("Dubai");
  await page.getByRole("button", { name: "Post job" }).click();
  await expect(page.getByText(/sent to the Wemuste team/)).toBeVisible();
  await expect(page.getByText("Waiting for review", { exact: true })).toBeVisible();
  await signOut(page);

  // A visitor already has the map open (another browser). The job isn't there yet.
  const visitorContext = await browser.newContext();
  const visitor = await visitorContext.newPage();
  await stubMapTiler(visitor);
  await visitor.goto("/");
  await visitor.getByRole("button", { name: "Not now" }).click();
  await visitor.getByRole("button", { name: /^List ·/ }).click();
  const visitorList = visitor.getByRole("region", { name: "All jobs" });
  await expect(visitorList.getByText("[SAMPLE] Weekend barista")).toBeVisible();
  await expect(visitorList.getByRole("button", { name: new RegExp(title) })).toHaveCount(0);

  // Admin approves: the job appears on the visitor's open map without a reload.
  await loginAsAdmin(page);
  await page.goto("/admin/jobs?status=pending");
  const row = page.getByRole("listitem").filter({ hasText: title });
  await row.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Approved. The job is now on the map.")).toBeVisible();
  await expect(visitorList.getByRole("button", { name: new RegExp(title) })).toBeVisible({
    timeout: 5_000,
  });

  // Admin hides it: it leaves the open map, again without a reload.
  await page.goto("/admin/jobs?status=published");
  await page
    .getByRole("listitem")
    .filter({ hasText: title })
    .getByRole("button", { name: "Hide" })
    .click();
  await expect(visitorList.getByRole("button", { name: new RegExp(title) })).toHaveCount(0, {
    timeout: 5_000,
  });
  await visitorContext.close();

  // A rejected job shows the reason to the sponsor.
  const second = `Leaflet helper ${unique()}`;
  psql(`insert into public.jobs (employer_id, title, description, location_label, lat, lng, country_code, country_name, city)
        select user_id, '${second}', 'Hand out leaflets near the metro.', 'Deira', 25.27, 55.31, 'AE', 'United Arab Emirates', 'Dubai'
          from public.employer_profiles where contact_email = 'employer@wemuste.local'`);
  await page.goto("/admin/jobs?status=pending");
  const pendingRow = page.getByRole("listitem").filter({ hasText: second });
  await pendingRow.getByRole("button", { name: "Reject" }).click();
  await pendingRow.getByLabel(/Why can't it be approved/).fill("Please add the working hours.");
  await pendingRow.getByRole("button", { name: "Send back to sponsor" }).click();
  await expect(page.getByText("Sent back to the sponsor.")).toBeVisible();
  await signOut(page);
  await login(page, "employer@wemuste.local");
  await page.getByRole("link", { name: new RegExp(second) }).click();
  await expect(page.getByText("Reason: Please add the working hours.")).toBeVisible();

  psql(`delete from public.jobs where title in ('${title}', '${second}')`);
});
