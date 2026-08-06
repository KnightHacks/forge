import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const bladeUrlSchema =
  process.env.NODE_ENV === "production"
    ? z.string().url()
    : z.string().url().default("http://localhost:3000");

export const env = createEnv({
  server: {
    BLADE_URL: bladeUrlSchema,
    KHIX_HACKER_PORTAL_CLIENT_ID: z.string().trim().min(1),
  },
  runtimeEnv: {
    BLADE_URL: process.env.BLADE_URL,
    KHIX_HACKER_PORTAL_CLIENT_ID: process.env.KHIX_HACKER_PORTAL_CLIENT_ID,
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
