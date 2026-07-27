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
  skipValidation:
    !!process.env.CI ||
    process.env.NODE_ENV === "test" ||
    process.env.npm_lifecycle_event === "lint",
});
