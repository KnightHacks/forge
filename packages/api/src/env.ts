import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    BLADE_URL: z.string().url(),
    ISSUE_DISCORD_THREADS_ENABLED: z.enum(["true", "false"]).default("false"),
    MINIO_ENDPOINT: z.string().min(1),
    MINIO_ACCESS_KEY: z.string().min(1),
    MINIO_SECRET_KEY: z.string().min(1),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  // Tests mock every storage client, so they never reach MinIO. Without the
  // test skip, local `pnpm test` fails on six files that CI passes, because CI
  // already skips validation — a divergence that hides real failures.
  skipValidation:
    !!process.env.CI ||
    process.env.NODE_ENV === "test" ||
    process.env.npm_lifecycle_event === "lint",
});

export const nodeEnv = z
  .enum(["development", "production", "test"])
  .default("development")
  .parse(process.env.NODE_ENV);

export const isBladeE2E = process.env.BLADE_E2E_AUTH === "true";
