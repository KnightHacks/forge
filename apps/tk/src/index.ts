import { Client } from "discord.js";

import { commands } from "./commands";
import { deployCommands } from "./deploy-commands";
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
  console.log("T.K is ready :)");

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
  if (!interaction.isCommand()) {
    return;
  }
  const { commandName } = interaction;
  void commands[commandName as keyof typeof commands].execute(interaction);
});

// Login to Discord
void client.login(env.DISCORD_BOT_TOKEN);
