import { Client } from "discord.js";

import { DISCORD } from "@forge/consts";
import { logger } from "@forge/utils";

import { safelyHandleTkInteraction } from "./command-handler";
import { commands } from "./commands";
import { deployCommands } from "./deploy-commands";
import { startDiscordArchiveGateway } from "./discord-archive/gateway";
import { env } from "./env";

/*
    Discord Bot Logic
*/

// Create a new discord bot client instance
export const client = new Client({
  intents: ["Guilds", "GuildMessages", "DirectMessages"],
});

// Log when T.K is ready
client.once("ready", () => {
  logger.log("T.K is ready :)");

  if (client.guilds.cache.size > 0) {
    for (const guild of client.guilds.cache.values()) {
      void deployCommands({ guildId: guild.id });
    }
  }
});

// Load commands when T.K joins a new guild
client.on("guildCreate", (guild) => {
  void deployCommands({ guildId: guild.id });
});

// Load interactions
client.on("interactionCreate", (interaction) => {
  void safelyHandleTkInteraction({
    commands,
    interaction,
    onError: () => {
      logger.error(
        "A T.K command failed. The bot and Discord archive listener remain available.",
      );
    },
  });
});

// Login to Discord
void client.login(env.DISCORD_BOT_TOKEN);

async function startArchiveGateway() {
  if (!env.DISCORD_ARCHIVE_BOT_TOKEN) {
    logger.info(
      "Discord archive Gateway is disabled because its token is not configured.",
    );
    return;
  }

  try {
    const { discordArchiveDatabaseStore } =
      await import("@forge/api/discord-archive.server");
    startDiscordArchiveGateway({
      guildId: DISCORD.KNIGHTHACKS_GUILD,
      store: discordArchiveDatabaseStore,
      token: env.DISCORD_ARCHIVE_BOT_TOKEN,
    });
  } catch {
    logger.error(
      "Discord archive Gateway could not start. Existing T.K. behavior remains available.",
    );
  }
}

void startArchiveGateway();
