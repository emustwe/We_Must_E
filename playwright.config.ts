import { defineConfig, devices } from "@playwright/test";

// End-to-end tests against the local Supabase stack (`npx supabase start`) and
// `.env.local`. Auth emails are read from the local Mailpit inbox.
// A dedicated port so the suite never runs against another local app on :3000.
const PORT = Number(process.env.E2E_PORT ?? 3100);
export const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // GitHub annotations in CI so failures are readable on the run page.
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    // A fake camera and microphone for the video-resume step.
    permissions: ["camera", "microphone"],
    launchOptions: {
      args: [
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
        // Software WebGL for the map on CI machines without a GPU.
        "--enable-unsafe-swiftshader",
        "--use-angle=swiftshader",
      ],
    },
  },
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: BASE_URL,
    // Never reuse whatever else happens to be listening on the port.
    reuseExistingServer: false,
    timeout: 120_000,
    // No Turnstile in tests (the server skips the check without a secret in development).
    env: {
      NEXT_PUBLIC_SITE_URL: BASE_URL,
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
      TURNSTILE_SECRET_KEY: "",
    },
  },
});
