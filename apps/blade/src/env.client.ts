/* eslint-disable no-restricted-properties */
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const bladeUrlSchema =
  process.env.NODE_ENV === "production"
    ? z.string().url()
    : z.string().url().default("http://localhost:3000");

export const clientEnv = createEnv({
  client: {
    NEXT_PUBLIC_BLADE_URL: bladeUrlSchema,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_BLADE_URL: process.env.NEXT_PUBLIC_BLADE_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
