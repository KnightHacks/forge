import { defineConfig } from "playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // Keep browser tests separate from Vitest's *.test.ts / *.spec.ts discovery.
  testMatch: "**/*.pw.ts",
  timeout: 60_000,
  use: {
    baseURL: process.env.KHIX_TEST_URL ?? "http://localhost:3007",
    contextOptions: { reducedMotion: "reduce" },
    viewport: { width: 1440, height: 900 },
  },
});
