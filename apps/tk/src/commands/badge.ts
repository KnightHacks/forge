/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
    CommandInteraction,
    SlashCommandBuilder,
    EmbedBuilder,
} from "discord.js";
import db from "../db/db";

// Slash command setup
export const data = new SlashCommandBuilder()
    .setName("badge")
    .setDescription("Shows your Knight Hacks VII Badge!");

// Logic for the badge command
export async function execute(interaction: CommandInteraction) {
    // Grabs data from db with sign-up form data to check for discord username
    const eventUser = await db.query.eventUsers.findFirst({
        where: (table, { eq }) => eq(table.discord_id, interaction.user.id),
    });

    // Checks if the user is not checked in
    if (!eventUser) {
        return interaction.reply({
            content: "You aren't checked in yet! Please run /check_in!",
            ephemeral: true,
        });
    }

    // Find the user's group
    const group = await db.query.groups.findFirst({
        where: (table, { eq }) => eq(table.id, eventUser.group_id),
    });

    // Find the user
    const user = await db.query.users.findFirst({
        where: (table, { eq }) => eq(table.id, eventUser.id),
    });

    const groupName =
        group!.name.charAt(0).toUpperCase() + group!.name.slice(1);
    const embed = new EmbedBuilder()
        .setTitle(`Hello, **${user?.firstName} ${user?.lastName}**!`)
        .setImage(group!.image)
        .setDescription(`You're a part of the ${groupName} Crew!`)
        .setColor(0xdbc34c);
    // Respond with a success status
    // TODO: ping group role!
    return interaction.reply({ embeds: [embed], ephemeral: true });
}
