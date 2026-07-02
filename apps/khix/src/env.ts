import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    BLADE_URL: z.string().url(),
  },
  experimental__runtimeEnv: {
    BLADE_URL: process.env.BLADE_URL,
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
