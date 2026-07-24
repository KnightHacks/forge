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
    PORT: z.coerce.number().default(3000),
  },
  server: {
    BLADE_E2E_AUTH: z.enum(["true", "false"]).optional(),
    BLADE_E2E_DEFAULT_USER_ID: z.string().uuid().optional(),
    STRIPE_SECRET_WEBHOOK_KEY: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_BLADE_E2E_AUTH: z.enum(["true", "false"]).optional(),
    NEXT_PUBLIC_BLADE_URL: z.string().url(),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  },
  experimental__runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_BLADE_E2E_AUTH: process.env.NEXT_PUBLIC_BLADE_E2E_AUTH,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    PORT: process.env.PORT,
    NEXT_PUBLIC_BLADE_URL:
      process.env.NEXT_PUBLIC_BLADE_URL || "http://localhost:3000",
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
