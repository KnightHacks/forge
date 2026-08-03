import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
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

/**
 * Opt-in: let a development environment send hackathon status mail for real.
 *
 * Off by default, and deliberately its own switch rather than a relaxation of
 * the development gate. That gate exists because `processEmailSend` refuses a
 * hackathon audience outside production, so a status change made in dev would
 * otherwise mark every recipient delivery-failed a couple of minutes later.
 *
 * Turning this on points a dev box at the real applicant table and mails real
 * students. It is opt-in per environment for that reason — there is no
 * "practice" mode here, and a bulk accept cannot be recalled.
 */
export const allowDevelopmentHackathonSends =
  process.env.BLADE_ALLOW_DEV_HACKATHON_SENDS === "true";
