import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    STRIPE_SECRET_KEY: z.string(),
    DISCORD_BOT_TOKEN: z.string(),
    RESEND_API_KEY: z.string(),
    RESEND_FROM_EMAIL: z.string().email(),
    NODE_ENV: z.enum(["development", "production"]).optional(),
    STRIPE_SECRET_WEBHOOK_KEY: z.string(),
    MINIO_ENDPOINT: z.string(),
    MINIO_ACCESS_KEY: z.string(),
    MINIO_SECRET_KEY: z.string(),
    WWDR_CERT_BASE64: z.string(),
    SIGNER_CERT_BASE64: z.string(),
    SIGNER_KEY_BASE64: z.string(),
    SIGNER_KEY_PASS_BASE64: z.string(),
    PASS_TYPE_IDENTIFIER: z.string(),
    TEAM_IDENTIFIER: z.string(),
    AUTH_SECRET: z.string(),
    BLADE_URL: z.string(),
  },
  experimental__runtimeEnv: {},
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
