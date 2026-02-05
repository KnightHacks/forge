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
    DATABASE_URL: z.string(),
    RESEND_API_KEY: z.string(),
    RESEND_FROM_EMAIL: z.string().email(),
    EMAIL_QUEUE_CRON: z.string(),
    EMAIL_DAILY_LIMIT: z.string(),
    DISCORD_EMAIL_QUEUE_CHANNEL_ID: z.string(),
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
    DATABASE_URL: process.env.DATABASE_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    EMAIL_QUEUE_CRON: process.env.EMAIL_QUEUE_CRON,
    EMAIL_DAILY_LIMIT: process.env.EMAIL_DAILY_LIMIT,
    DISCORD_EMAIL_QUEUE_CHANNEL_ID: process.env.DISCORD_EMAIL_QUEUE_CHANNEL_ID,
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
