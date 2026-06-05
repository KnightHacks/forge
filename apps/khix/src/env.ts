import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

import { env as apiEnv } from "@forge/api/env";
import { env as authEnv } from "@forge/auth/env";
import { env as dbEnv } from "@forge/db/env";

export const env = createEnv({
  extends: [authEnv, apiEnv, dbEnv],
  shared: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
  },
  server: {},
  client: {},
  experimental__runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
