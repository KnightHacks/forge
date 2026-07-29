import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DISCORD_ARCHIVE_BOT_TOKEN: z.string().min(1).optional(),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    DISCORD_BOT_TOKEN: z.string(),
    DISCORD_WEBHOOK_ANIMAL: z.string(),
    DISCORD_WEBHOOK_LEETCODE: z.string(),
    DISCORD_WEBHOOK_REMINDERS: z.string(),
    DISCORD_WEBHOOK_REMINDERS_PRE: z.string(),
    DISCORD_WEBHOOK_REMINDERS_HACK: z.string(),
    BLADE_URL: z.string().url(),
  },
  runtimeEnvStrict: {
    DISCORD_ARCHIVE_BOT_TOKEN: process.env.DISCORD_ARCHIVE_BOT_TOKEN,
    NODE_ENV: process.env.NODE_ENV,
    DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
    DISCORD_WEBHOOK_ANIMAL: process.env.DISCORD_WEBHOOK_ANIMAL,
    DISCORD_WEBHOOK_LEETCODE: process.env.DISCORD_WEBHOOK_LEETCODE,
    DISCORD_WEBHOOK_REMINDERS: process.env.DISCORD_WEBHOOK_REMINDERS,
    DISCORD_WEBHOOK_REMINDERS_PRE: process.env.DISCORD_WEBHOOK_REMINDERS_PRE,
    DISCORD_WEBHOOK_REMINDERS_HACK: process.env.DISCORD_WEBHOOK_REMINDERS_HACK,
    BLADE_URL: process.env.BLADE_URL,
  },
  emptyStringAsUndefined: true,
  // Tests never reach the services these validate, so a checkout without a
  // local .env can still run the suite. Without this, `pnpm test` fails on
  // env parsing while CI passes, because CI already skips.
  skipValidation:
    !!process.env.CI ||
    process.env.NODE_ENV === "test" ||
    process.env.npm_lifecycle_event === "lint",
});
