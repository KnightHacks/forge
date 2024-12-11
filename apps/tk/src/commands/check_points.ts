import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import db from "../db/db";

// CHECK POINTS COMMAND
// Command to check your number of points

// Create the command
export const data = new SlashCommandBuilder()
    .setName("check_points")
    .setDescription("Replies with your number of points!");

// Logic for the check points command
export async function execute(interaction: CommandInteraction) {
    const user = await db.query.users.findFirst({
        where: (table, { eq }) => eq(table.discord_id, interaction.user.id),
    });

    if (!user) {
        return interaction.reply({
            content: "You have 0 points...",
            ephemeral: true,
        });
    }

    return interaction.reply({
        content: `You have ${user.points} points!`,
        ephemeral: true,
    });
}
