import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DISCORD_BOT_TOKEN: z.string(),
    DISCORD_WEBHOOK_ANIMAL: z.string(),
    DISCORD_WEBHOOK_LEETCODE: z.string(),
    DISCORD_WEBHOOK_REMINDERS: z.string(),
    DISCORD_WEBHOOK_REMINDERS_PRE: z.string(),
    DISCORD_WEBHOOK_REMINDERS_HACK: z.string(),
  },
  runtimeEnvStrict: {
    DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
    DISCORD_WEBHOOK_ANIMAL: process.env.DISCORD_WEBHOOK_ANIMAL,
    DISCORD_WEBHOOK_LEETCODE: process.env.DISCORD_WEBHOOK_LEETCODE,
    DISCORD_WEBHOOK_REMINDERS: process.env.DISCORD_WEBHOOK_REMINDERS,
    DISCORD_WEBHOOK_REMINDERS_PRE: process.env.DISCORD_WEBHOOK_REMINDERS_PRE,
    DISCORD_WEBHOOK_REMINDERS_HACK: process.env.DISCORD_WEBHOOK_REMINDERS_HACK,
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
