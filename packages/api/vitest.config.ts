import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Integration files replace the process-wide DATABASE_URL before importing
    // the singleton DB pool. Parallel teardown can otherwise race a disposable
    // database drop and surface Postgres 57P01 after every assertion passed.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      // Several modules reachable from `appRouter` import `server-only`, which
      // throws on import outside a React Server Component. Tests here exercise
      // the router surface and procedure logic directly, never a React render,
      // so the guard has nothing to protect and is stubbed out.
      "server-only": fileURLToPath(
        new URL("./src/tests/support/server-only-stub.ts", import.meta.url),
      ),
    },
  },
});
