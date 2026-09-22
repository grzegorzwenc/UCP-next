import { defineConfig, devices } from "@playwright/test";

/** End-to-end tests against the dev server on :3100 (reused when already running). */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure", ...devices["Desktop Chrome"] },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: "npm run dev -- -p 3100", url: "http://localhost:3100/login", reuseExistingServer: true, timeout: 120_000 },
});
