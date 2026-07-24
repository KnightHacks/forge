import { defineConfig, devices } from "playwright/test";

const guildPort = 3003;
const bladePort = 3000;
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${guildPort}`;
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === "true";

export default defineConfig({
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  outputDir: ".playwright-results",
  reporter: [["list"], ["html", { open: "never" }]],
  testDir: "./src/tests/e2e",
  timeout: 60_000,
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: skipWebServer
    ? undefined
    : [
        {
          command: `NODE_ENV=development pnpm --dir ../blade with-env next dev --hostname localhost --port ${bladePort}`,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          url: `http://localhost:${bladePort}`,
        },
        {
          command: `NODE_ENV=development NEXT_PUBLIC_TRPC_URL=http://localhost:${bladePort} pnpm with-env next dev --hostname localhost --port ${guildPort}`,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          url: baseURL,
        },
      ],
  workers: 1,
});
