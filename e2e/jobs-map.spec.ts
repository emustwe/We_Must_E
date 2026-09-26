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
    // Like MapTiler: the street at the pin, unless only areas are asked for
    // (the app asks for areas, so a public name never gives the exact point).
    const street = reverse && !url.searchParams.get("types")?.includes("neighbourhood");
    const context = [
      { id: "place.1", text: "Dubai Marina" },
      { id: "region.2", text: "Dubai Emirate" },
      { id: "country.3", text: "United Arab Emirates", country_code: "ae" },
    ];
    return route.fulfill({
      json: {
        features: [
          {
            place_name: street
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

// "N jobs in this area" (what the map shows).
async function jobsInArea(page: Page) {
  const pill = page.getByText(/^\d+ jobs? in this area$/);
  await expect(pill).toBeVisible();
  return Number((await pill.textContent())!.match(/^\d+/)![0]);
}
const pin = (page: Page, title: string) =>
  page.locator(`.leaflet-marker-icon[title="${title}"] .wm-p-pill`);

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
  // Jobs are pins (or clusters of pins) on the map; there is no list.
  await expect(page.locator(".wm-p-pill, .wm-c").first()).toBeVisible();
  expect(await jobsInArea(page)).toBeGreaterThan(0);

  // Search a place: the map moves there.
  await page.getByRole("combobox", { name: "City or area" }).fill("Marina");
  await page.getByRole("option", { name: /Dubai Marina/ }).click();
  await expect(page.getByRole("combobox", { name: "City or area" })).toHaveValue(
    "Dubai Marina, Dubai, United Arab Emirates",
  );

  // Tapping a pin opens the job (a bottom sheet on phones).
  await pin(page, "Weekend barista").click();
  const sheet = page.getByRole("region", { name: "Weekend barista" });
  await expect(sheet.getByText("Sample listing")).toBeVisible(); // a badge, not "[SAMPLE]"
  await expect(sheet.getByText(sponsorName, { exact: true })).toBeVisible();
  await expect(sheet.getByText("Dubai Marina", { exact: true })).toBeVisible();
  await expect(sheet.getByText("Free to apply. We never ask for money.")).toBeVisible();
  // The open job is in the URL, so it can be shared.
  await expect(page).toHaveURL(/\?job=[0-9a-f-]{36}$/);
  // Saving keeps it on this device.
  await sheet.getByRole("button", { name: "Save job" }).click();
  await expect(sheet.getByRole("button", { name: "Remove from saved" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await sheet.getByRole("button", { name: "Close job details" }).click();
  await expect(sheet).toHaveCount(0);

  // Opening the shared link shows the job; Apply starts the application.
  const id = psql(`select id from public.jobs where title = '[SAMPLE] Weekend barista'`);
  await page.goto(`/?job=${id}`);
  await page
    .getByRole("region", { name: "Weekend barista" })
    .getByRole("link", { name: "Apply for this job" })
    .click();
  await expect(page).toHaveURL(/\/apply\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Apply in 3 short steps" })).toBeVisible();

  // The public page never receives exact coordinates.
  const html = await (await page.request.get("/")).text();
  expect(html).not.toContain("25.0805,");
  expect(html).not.toContain("employer_id");
});

test("with location allowed, the distance filter keeps the nearest jobs", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 25.0805, longitude: 55.1403 }); // Dubai Marina
  await page.goto("/");
  await expect(page.locator(".wm-you")).toBeAttached(); // "you are here"
  await page.getByRole("button", { name: "Filters" }).click();
  await page.getByRole("button", { name: "2 km", exact: true }).click();
  await expect(pin(page, "Bike delivery rider")).toHaveCount(0); // Downtown, too far
  await pin(page, "Weekend barista").click();
  const sheet = page.getByRole("region", { name: "Weekend barista" });
  await expect(sheet.getByText(/^0\.\d km$/)).toBeVisible();
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
  const before = await jobsInArea(visitor);

  // Admin approves: the job appears on the visitor's open map without a reload.
  await loginAsAdmin(page);
  await page.goto("/admin/jobs?status=pending");
  const row = page.getByRole("listitem").filter({ hasText: title });
  await row.getByRole("button", { name: "Approve for map" }).click();
  await expect(page.getByText("Approved. The job is now on the map.")).toBeVisible();
  await expect(visitor.getByText(`${before + 1} jobs in this area`)).toBeVisible({
    timeout: 5_000,
  });

  // Admin hides it: it leaves the open map, again without a reload.
  await page.goto("/admin/jobs?status=published");
  await page
    .getByRole("listitem")
    .filter({ hasText: title })
    .getByRole("button", { name: "Hide" })
    .click();
  await expect(visitor.getByText(`${before} jobs in this area`)).toBeVisible({
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
  await pendingRow.getByRole("button", { name: "Needs changes" }).click();
  await pendingRow
    .getByLabel("What should the sponsor change?")
    .fill("Please add the working hours.");
  await pendingRow.getByRole("button", { name: "Send back" }).click();
  await expect(page.getByText("Sent back to the sponsor.")).toBeVisible();
  await signOut(page);
  await login(page, "employer@wemuste.local");
  await page.getByRole("link", { name: new RegExp(second) }).click();
  await expect(page.getByText("Reason: Please add the working hours.")).toBeVisible();

  psql(`delete from public.jobs where title in ('${title}', '${second}')`);
});

test("an example job shows what a job looks like, with no way to apply", async ({ page }) => {
  const title = `Example cashier ${unique()}`;
  const id =
    psql(`insert into public.jobs (employer_id, title, description, location_label, lat, lng, country_code, country_name, city, status, is_example)
        select user_id, '${title}', 'Serve customers at the till.', 'Dubai Marina', 25.0805, 55.1403, 'AE', 'United Arab Emirates', 'Dubai', 'published', true
          from public.employer_profiles where contact_email = 'employer@wemuste.local' returning id`);
  try {
    await page.goto(`/?job=${id}`);
    const sheet = page.getByRole("region", { name: title });
    await expect(sheet.getByText("Example job").first()).toBeVisible();
    await expect(
      sheet.getByText("It is not open for applications.", { exact: false }),
    ).toBeVisible();
    await expect(sheet.getByRole("link", { name: "Apply for this job" })).toHaveCount(0);
    // A direct link to the application doesn't open it either.
    await page.goto(`/apply/${id}`);
    await expect(page.getByRole("button", { name: "Start application" })).toHaveCount(0);
  } finally {
    psql(`delete from public.jobs where id = '${id}'`);
  }
});
