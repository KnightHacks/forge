/* eslint-disable no-restricted-properties */
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const authSharedEnv = createEnv({
  server: {
    DISCORD_CLIENT_ID: z.string().min(1),
    DISCORD_CLIENT_SECRET: z.string().min(1),
    BETTER_AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string().min(1)
        : z.string().min(1).optional(),
  },
  shared: {
    NODE_ENV: z.enum(["development", "production"]).optional(),
  },
  experimental__runtimeEnv: { NODE_ENV: process.env.NODE_ENV },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
