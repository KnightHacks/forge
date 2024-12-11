import { CommandInteraction, SlashCommandBuilder } from "discord.js";

// BEEP COMMAND
// Test command to check if the bot is online

// Create the command
export const data = new SlashCommandBuilder()
    .setName("beep")
    .setDescription("Replies with Boop!");

// Logic for the ping command
export async function execute(interaction: CommandInteraction) {
    return interaction.reply("Boop!");
}
