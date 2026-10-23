import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  timeout: 60000,
  // Each OS compares its own Playwright snapshots. Refresh with
  // `npx playwright test --update-snapshots` on that OS. Do not copy one
  // platform's PNG over another's filename.
  ignoreSnapshots: false,
  use: {
    baseURL: process.env.ATLAS_TEST_URL || "http://127.0.0.1:5173",
    headless: true,
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-webgl"] },
  },
  workers: 1,
  reporter: "list",
});
