import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

import { hackathonPortalOriginSchema } from "@forge/validators";

const bladeUrlSchema =
  process.env.NODE_ENV === "production"
    ? hackathonPortalOriginSchema
    : hackathonPortalOriginSchema.default("http://localhost:3000");

const khixUrlSchema =
  process.env.NODE_ENV === "production"
    ? hackathonPortalOriginSchema
    : hackathonPortalOriginSchema.default("http://localhost:3007");

export const env = createEnv({
  server: {
    BLADE_URL: bladeUrlSchema,
    KHIX_URL: khixUrlSchema,
  },
  shared: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().default(3007),
  },
  runtimeEnv: {
    BLADE_URL: process.env.BLADE_URL,
    KHIX_URL: process.env.KHIX_URL,
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
