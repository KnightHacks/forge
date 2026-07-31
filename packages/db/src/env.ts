import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
  },
  runtimeEnv: process.env,
  // Tests never reach the services these validate, so a checkout without a
  // local .env can still run the suite. Without this, `pnpm test` fails on
  // env parsing while CI passes, because CI already skips.
  //
  // `VITEST` is checked because `NODE_ENV === "test"` is not reachable here:
  // `pnpm test` runs through `dotenv -e ../../.env`, and that file sets
  // `NODE_ENV="development"`, overriding Vitest's default. Without validation
  // skipped, `createEnv` *snapshots* `process.env` at first import, so
  // `provisionDisposableDatabase` reassigning `DATABASE_URL` had no effect and
  // every disposable-database test silently wrote to the shared dev database
  // instead. CI sets `CI`, so the bug was invisible there and local-only.
  skipValidation:
    !!process.env.CI ||
    !!process.env.VITEST ||
    process.env.NODE_ENV === "test" ||
    process.env.npm_lifecycle_event === "lint",
});
