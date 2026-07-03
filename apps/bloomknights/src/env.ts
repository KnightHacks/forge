import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

import { hackathonPortalOriginSchema } from "@forge/validators";

export const env = createEnv({
  server: {
    BLOOMKNIGHTS_URL: hackathonPortalOriginSchema.default(
      "http://localhost:3006",
    ),
  },
  shared: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().default(3006),
  },
  runtimeEnv: {
    BLOOMKNIGHTS_URL: process.env.BLOOMKNIGHTS_URL,
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
