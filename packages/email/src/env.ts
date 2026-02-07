import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    LISTMONK_URL: z.string(),
    LISTMONK_USER: z.string(),
    LISTMONK_TOKEN: z.string(),
  },
  experimental__runtimeEnv: {},
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
