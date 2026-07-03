import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const googleEnv = createEnv({
  server: {
    GOOGLE_CLIENT_EMAIL: z.string(),
    GOOGLE_PRIVATE_KEY_B64: z.string(),
  },
  runtimeEnv: process.env,
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
