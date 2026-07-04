import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

import { authSharedEnv } from "./shared-env";

export const env = createEnv({
  extends: [authSharedEnv],
  server: { BLADE_URL: z.string().url() },
  client: { NEXT_PUBLIC_BLADE_URL: z.string().url() },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_BLADE_URL:
      process.env.NEXT_PUBLIC_BLADE_URL || "http://localhost:3000",
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
