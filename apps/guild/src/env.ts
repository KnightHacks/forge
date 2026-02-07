import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  client: {
    NEXT_PUBLIC_TRPC_URL: z.string().url().default("http://localhost:3000"),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_TRPC_URL: process.env.NEXT_PUBLIC_TRPC_URL,
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
