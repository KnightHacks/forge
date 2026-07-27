import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const listmonkFromEmailSchema = z
  .string()
  .trim()
  .min(3)
  .max(320)
  .refine(
    (value) =>
      z.email().safeParse(value).success ||
      /^[^<>\r\n]+<[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+>$/.test(value),
    "Expected an email address or a display name with an email address.",
  );

export const env = createEnv({
  server: {
    BLADE_E2E_AUTH: z.enum(["true", "false"]).optional(),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    LISTMONK_CAMPAIGN_TEMPLATE_ID: z.coerce
      .number()
      .int()
      .positive()
      .optional(),
    LISTMONK_URL: z.string().url().optional(),
    LISTMONK_USER: z.string().min(1).optional(),
    LISTMONK_TOKEN: z.string().min(1).optional(),
    LISTMONK_FROM_EMAIL: listmonkFromEmailSchema.optional(),
  },
  runtimeEnv: process.env,
  // Tests never reach the services these validate, so a checkout without a
  // local .env can still run the suite. Without this, `pnpm test` fails on
  // env parsing while CI passes, because CI already skips.
  skipValidation:
    !!process.env.CI ||
    process.env.NODE_ENV === "test" ||
    process.env.npm_lifecycle_event === "lint",
});
