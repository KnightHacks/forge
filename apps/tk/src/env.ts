import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DISCORD_BOT_TOKEN: z.string(),
    DISCORD_CLIENT_ID: z.string(),
    DISCORD_CLIENT_SECRET: z.string(),
    DISCORD_ANIMAL_WEBHOOK_URL: z.string(),
    DISCORD_LEETCODE_DAILY_WEBHOOK_URL: z.string(),
    DISCORD_WEATHER_API_KEY: z.string(),
    DISCORD_DAILY_REMINDERS_WEBHOOK_URL: z.string(),
    DISCORD_PRE_DAILY_REMINDERS_WEBHOOK_URL: z.string(),
    DISCORD_HACKATHON_WEBHOOK_URL: z.string(),
  },
  runtimeEnvStrict: {
    DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
    DISCORD_ANIMAL_WEBHOOK_URL: process.env.DISCORD_DAILY_ANIMAL_WEBHOOK_URL,
    DISCORD_LEETCODE_DAILY_WEBHOOK_URL:
      process.env.DISCORD_LEETCODE_DAILY_WEBHOOK_URL,
    DISCORD_WEATHER_API_KEY: process.env.DISCORD_WEATHER_API_KEY,
    DISCORD_DAILY_REMINDERS_WEBHOOK_URL:
      process.env.DISCORD_DAILY_REMINDERS_WEBHOOK_URL,
    DISCORD_PRE_DAILY_REMINDERS_WEBHOOK_URL:
      process.env.DISCORD_PRE_DAILY_REMINDERS_WEBHOOK_URL,
    DISCORD_HACKATHON_WEBHOOK_URL: process.env.DISCORD_HACKATHON_WEBHOOK_URL,
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
