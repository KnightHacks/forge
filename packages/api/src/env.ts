import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {},
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});

export const nodeEnv = z
  .enum(["development", "production", "test"])
  .default("development")
  .parse(process.env.NODE_ENV);
