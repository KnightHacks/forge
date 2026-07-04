import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const discordEnv = createEnv({
  server: { DISCORD_BOT_TOKEN: z.string() },
  runtimeEnv: process.env,
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
