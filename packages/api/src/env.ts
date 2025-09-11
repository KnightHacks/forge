import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    STRIPE_SECRET_KEY: z.string().or(z.literal("dummy")),
    DISCORD_BOT_TOKEN: z.string().or(z.literal("dummy")),
    GOOGLE_CLIENT_EMAIL: z.string().or(z.literal("dummy")),
    GOOGLE_PRIVATE_KEY_B64: z.string().or(z.literal("dummy")),
    NODE_ENV: z.enum(["development", "production"]).optional(),
    STRIPE_SECRET_WEBHOOK_KEY: z.string().or(z.literal("dummy")),
    MINIO_ENDPOINT: z.string().or(z.literal("dummy")),
    MINIO_ACCESS_KEY: z.string().or(z.literal("dummy")),
    MINIO_SECRET_KEY: z.string().or(z.literal("dummy")),
    WWDR_CERT_BASE64: z.string().or(z.literal("dummy")),
    SIGNER_CERT_BASE64: z.string().or(z.literal("dummy")),
    SIGNER_KEY_BASE64: z.string().or(z.literal("dummy")),
    SIGNER_KEY_PASS_BASE64: z.string().or(z.literal("dummy")),
    PASS_TYPE_IDENTIFIER: z.string().or(z.literal("dummy")),
    TEAM_IDENTIFIER: z.string().or(z.literal("dummy")),
  },
  experimental__runtimeEnv: {},
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
