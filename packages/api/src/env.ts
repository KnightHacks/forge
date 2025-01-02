import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    STRIPE_SECRET_KEY: z.string(),
    DISCORD_BOT_TOKEN: z.string(),
    MINIO_S3_URL: z.string(),
    NODE_ENV: z.enum(["development", "production"]).optional(),
  },
  experimental__runtimeEnv: {},
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
