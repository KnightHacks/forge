import {
    CommandInteraction,
    SlashCommandBuilder
} from "discord.js";

export const data = new SlashCommandBuilder()
    .setName("bubblewrap")
    .setDescription("Gives you some bubble wrap!");

export async function execute(interaction: CommandInteraction) {
    const NUM_ROWS = 8;

    await interaction.reply(
        "Here you go!\n" +
        "||pop||||pop||||pop||||pop||||pop||||pop||\n".repeat(NUM_ROWS)
    );
}