import {
    CommandInteraction,
    PermissionsBitField,
    SlashCommandBuilder,
} from "discord.js";
import db from "../db/db";
import { events } from "../db/schema";

// CREATE EVENT COMMAND
// Command to create an event

// Create the command
export const data = new SlashCommandBuilder()
    .setName("create_event")
    .setDescription("Creates a social event!")
    .addStringOption((option) =>
        option
            .setName("event_name")
            .setDescription("The name of the event")
            .setRequired(true)
    )
    .addStringOption((option) =>
        option
            .setName("password")
            .setDescription("Password for event")
            .setRequired(true)
    )
    .addNumberOption((option) =>
        option
            .setName("point_value")
            .setDescription("Points given to attendees")
            .setRequired(true)
    );

// Logic for the ping command
export async function execute(interaction: CommandInteraction) {
    // Check if the user has permission to run this command by checking if they are in the admin array
    if (
        !(interaction.member?.permissions as PermissionsBitField).has(
            "Administrator"
        )
    ) {
        return interaction.reply({
            content:
                "You do not have permission to run this command. Nice try...",
            ephemeral: true,
        });
    }

    try {
        // Create the event in the database
        await db.insert(events).values({
            name: `${interaction.options.get("event_name")?.value}`,
            password: `${interaction.options.get("password")?.value}`,
            point_value: interaction.options.get("point_value")
                ?.value as number,
        });

        // Respond with a success status
        return interaction.reply({
            content: `EVENT CREATED: ${
                interaction.options.get("event_name")?.value
            } ${interaction.options.get("password")?.value} ${
                interaction.options.get("point_value")?.value
            }`,
            ephemeral: true,
        });
    } catch (err) {
        // Log the error
        console.error(err);
        return interaction.reply({
            content: `There was an error creating the event: ${err} `,
            ephemeral: true,
        });
    }
}
