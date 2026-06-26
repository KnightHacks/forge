import { defineConfig } from "playwright/test";

const port = 3100;
const baseURL = `http://localhost:${port}`;
const defaultE2EUserId = "00000000-0000-4000-8000-000000000101";

export default defineConfig({
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  outputDir: ".playwright-results",
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  testDir: "./src/tests/e2e",
  timeout: 60_000,
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    viewport: { height: 1000, width: 1440 },
  },
  webServer: {
    command: [
      "BLADE_E2E_AUTH=true",
      "NEXT_PUBLIC_BLADE_E2E_AUTH=true",
      `BLADE_E2E_DEFAULT_USER_ID=${defaultE2EUserId}`,
      `NEXT_PUBLIC_BLADE_URL=${baseURL}`,
      `BLADE_URL=${baseURL}`,
      `PORT=${port}`,
      "npm exec --yes pnpm@9.12.1 -- with-env next dev --hostname 127.0.0.1 --port",
      String(port),
    ].join(" "),
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: baseURL,
  },
  workers: 1,
});
