import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DISCORD_CLIENT_ID: z.string().min(1),
    DISCORD_CLIENT_SECRET: z.string().min(1),
    BETTER_AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string().min(1)
        : z.string().min(1).optional(),
    BLADE_URL: z.string(),
  },
  client: {
    NEXT_PUBLIC_BLADE_URL: z.string().url(),
  },
  shared: {
    NODE_ENV: z.enum(["development", "production"]).optional(),
  },
  experimental__runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_BLADE_URL:
      process.env.NEXT_PUBLIC_BLADE_URL || "http://localhost:3000",
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
