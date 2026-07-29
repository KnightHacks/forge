import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DISCORD_BOT_TOKEN: z.string(),
    STRIPE_SECRET_KEY: z.string(),
    GOOGLE_CLIENT_EMAIL: z.string(),
    GOOGLE_PRIVATE_KEY_B64: z.string(),
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
