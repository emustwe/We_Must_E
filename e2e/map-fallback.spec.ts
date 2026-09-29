import { expect, test } from "@playwright/test";

// A browser without WebGL (switched off, or blocked after a graphics crash)
// still gets a map: ordinary picture tiles instead of the vector map.
test.use({ launchOptions: { args: ["--disable-webgl", "--disable-3d-apis"] } });
test("without WebGL the map uses picture tiles", async ({ page }) => {
  const tiles: string[] = [];
  page.on("request", (r) => {
    if (/api\.maptiler\.com\/maps\/[^/]+\/256\//.test(r.url())) tiles.push(r.url());
  });
  await page.goto("/");
  await expect(page.locator(".leaflet-tile").first()).toBeAttached({ timeout: 15000 });
  expect(tiles.length).toBeGreaterThan(0);
});
