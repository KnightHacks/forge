import { defineConfig, devices } from "playwright/test";

export default defineConfig({
  testDir: "./src/tests/e2e",
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3008",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], screenshot: "only-on-failure" },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3008",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  workers: 1,
});
