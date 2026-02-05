import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DISCORD_BOT_TOKEN: z.string(),
    DISCORD_CLIENT_ID: z.string(),
    DISCORD_WEATHER_API_KEY: z.string(),
  },
  runtimeEnvStrict: {
    DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
    DISCORD_WEATHER_API_KEY: process.env.DISCORD_WEATHER_API_KEY,
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
