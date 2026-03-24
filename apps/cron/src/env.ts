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
    DISCORD_WEBHOOK_ISSUE_TEAMS: z.string().url().optional(),
    DISCORD_WEBHOOK_ISSUE_DIRECTORS: z.string().url().optional(),
    DISCORD_WEBHOOK_ISSUE_DESIGN: z.string().url().optional(),
    DISCORD_WEBHOOK_ISSUE_HACKORG: z.string().url().optional(),
    ISSUE_REMINDERS_ENABLED: z.enum(["true", "false"]).optional(),
    BLADE_URL: z.string().url(),
  },
  runtimeEnvStrict: {
    DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
    DISCORD_WEBHOOK_ANIMAL: process.env.DISCORD_WEBHOOK_ANIMAL,
    DISCORD_WEBHOOK_LEETCODE: process.env.DISCORD_WEBHOOK_LEETCODE,
    DISCORD_WEBHOOK_REMINDERS: process.env.DISCORD_WEBHOOK_REMINDERS,
    DISCORD_WEBHOOK_REMINDERS_PRE: process.env.DISCORD_WEBHOOK_REMINDERS_PRE,
    DISCORD_WEBHOOK_REMINDERS_HACK: process.env.DISCORD_WEBHOOK_REMINDERS_HACK,
    DISCORD_WEBHOOK_ISSUE_TEAMS: process.env.DISCORD_WEBHOOK_ISSUE_TEAMS,
    DISCORD_WEBHOOK_ISSUE_DIRECTORS:
      process.env.DISCORD_WEBHOOK_ISSUE_DIRECTORS,
    DISCORD_WEBHOOK_ISSUE_DESIGN: process.env.DISCORD_WEBHOOK_ISSUE_DESIGN,
    DISCORD_WEBHOOK_ISSUE_HACKORG: process.env.DISCORD_WEBHOOK_ISSUE_HACKORG,
    ISSUE_REMINDERS_ENABLED: process.env.ISSUE_REMINDERS_ENABLED,
    BLADE_URL: process.env.BLADE_URL,
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
