import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const bladeUrlSchema =
  process.env.NODE_ENV === "production"
    ? z.string().url()
    : z.string().url().default("http://localhost:3000");

const portalOriginSchema =
  process.env.NODE_ENV === "production"
    ? z.string().url()
    : z.string().url().default("http://localhost:3007");

export const env = createEnv({
  server: {
    BLADE_URL: bladeUrlSchema,
    KHIX_HACKER_PORTAL_CLIENT_ID: z.string().trim().min(1),
    KHIX_HACKER_PORTAL_ORIGIN: portalOriginSchema,
  },
  runtimeEnv: {
    BLADE_URL: process.env.BLADE_URL,
    KHIX_HACKER_PORTAL_CLIENT_ID: process.env.KHIX_HACKER_PORTAL_CLIENT_ID,
    KHIX_HACKER_PORTAL_ORIGIN: process.env.KHIX_HACKER_PORTAL_ORIGIN,
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
