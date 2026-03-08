import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 30000,
    globalTeardown: ["./setup/db.ts"],
    setupFiles: ["./setup/vitest.setup.ts"],
  },
});
