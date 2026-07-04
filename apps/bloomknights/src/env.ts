import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

import { hackathonPortalOriginSchema } from "@forge/validators";

const bladeUrlSchema =
  process.env.NODE_ENV === "production"
    ? hackathonPortalOriginSchema
    : hackathonPortalOriginSchema.default("http://localhost:3000");

const bloomKnightsUrlSchema =
  process.env.NODE_ENV === "production"
    ? hackathonPortalOriginSchema
    : hackathonPortalOriginSchema.default("http://localhost:3006");

export const env = createEnv({
  server: {
    BLADE_URL: bladeUrlSchema,
    BLOOMKNIGHTS_URL: bloomKnightsUrlSchema,
  },
  shared: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().default(3006),
  },
  runtimeEnv: {
    BLADE_URL: process.env.BLADE_URL,
    BLOOMKNIGHTS_URL: process.env.BLOOMKNIGHTS_URL,
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
