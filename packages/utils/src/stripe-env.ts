import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const stripeEnv = createEnv({
  server: { STRIPE_SECRET_KEY: z.string() },
  runtimeEnv: process.env,
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
