import { REST, Routes } from "discord.js";
import { config } from "./config";
import { commands } from "./commands";

// Get all of the commands from /src/commands/index.ts
const commandsData = Object.values(commands).map((command) => command.data);

// Create a new REST client
const rest = new REST({ version: "10" }).setToken(config.DISCORD_TOKEN);

// Type for the deployCommands function
type DeployCommandsProps = {
    guildId: string;
};

// Deploy the commands to the guild
export async function deployCommands({ guildId }: DeployCommandsProps) {
    try {
        // Log that the commands are being refreshed
        console.log("Started refreshing application (/) commands.");

        // Load all of the commands
        await rest.put(
            Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, guildId),
            {
                body: commandsData,
            }
        );

        // Log that the commands have been successfully reloaded
        console.log("Successfully reloaded application (/) commands.");
    } catch (error) {
        // Log any errors that occur
        console.error(error);
    }
}
