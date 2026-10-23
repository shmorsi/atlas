import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  timeout: 60000,
  // Committed snapshots are macOS Chromium. Other OS runs keep the behavioral checks.
  ignoreSnapshots: process.platform !== "darwin",
  use: {
    baseURL: process.env.ATLAS_TEST_URL || "http://127.0.0.1:5173",
    headless: true,
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-webgl"] },
  },
  workers: 1,
  reporter: "list",
});
