import { Client } from "discord.js";
import { commands } from "./commands";
import { config } from "./config";
import { deployCommands } from "./deploy-commands";
import { hooks } from "./hooks";

/*
    Discord Bot Logic
*/

// Create a new discord bot client instance
export const client = new Client({
    intents: ["Guilds", "GuildMessages", "DirectMessages"],
});

// Log when T.K is ready
client.once("ready", async () => {
    console.log("T.K is ready :)");

    if (client.guilds.cache.size > 0) {
        for (const guild of client.guilds.cache.values()) {
            await deployCommands({ guildId: guild.id });
        }
    }
});

// Load commands when T.K joins a new guild
client.on("guildCreate", async (guild) => {
    await deployCommands({ guildId: guild.id });
});

// Load interactions
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) {
        return;
    }
    const { commandName } = interaction;
    if (commands[commandName as keyof typeof commands]) {
        commands[commandName as keyof typeof commands].execute(interaction);
    }
});

// Login to Discord
client.login(config.DISCORD_TOKEN);

/*
    Webhook Logic
*/

// Call all of the hooks (each hook will need a webhook client created in the hook)
for (const hook of Object.values(hooks)) {
    hook(client);
}
