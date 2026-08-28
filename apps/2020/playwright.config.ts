import { defineConfig, devices } from "playwright/test";

const port = process.env.ARCHIVE_E2E_PORT ?? "4108";
const baseURL = `http://127.0.0.1:${port}`;
const containerName = `forge-archive-2020-e2e-${port}`;
process.env.ARCHIVE_E2E_CONTAINER = containerName;

export default defineConfig({
  globalTeardown: "../../scripts/stop-archive-e2e-container.ts",
  testDir: "./e2e",
  outputDir: "./.playwright-results",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `sh ../../scripts/run-archive-e2e-server.sh 2020 ${port} 3008 ${containerName}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 300_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
