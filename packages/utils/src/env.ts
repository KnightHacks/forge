import { createEnv } from "@t3-oss/env-nextjs"; // TODO: look into not using the nextjs version
import { z } from "zod";

export const env = createEnv({
  server: {
    DISCORD_BOT_TOKEN: z.string(),
    STRIPE_SECRET_KEY: z.string(),
  },
  experimental__runtimeEnv: {},
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
