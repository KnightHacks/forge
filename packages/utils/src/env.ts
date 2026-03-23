import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DISCORD_BOT_TOKEN: z.string(),
    STRIPE_SECRET_KEY: z.string(),
    GOOGLE_CLIENT_EMAIL: z.string(),
    GOOGLE_PRIVATE_KEY_B64: z.string(),
  },
  runtimeEnv: {},
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
