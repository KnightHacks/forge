import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import db from "../db/db";
import { events, eventUsers, users, usersToEvents } from "../db/schema";
import { and, eq } from "drizzle-orm";

// SIGN IN EVENT COMMAND
// Command to sign into an event

// Create the command
export const data = new SlashCommandBuilder()
    .setName("sign_in")
    .setDescription("Signs in to a social event!")
    .addStringOption((option) =>
        option
            .setName("password")
            .setDescription("The password for the event")
            .setRequired(true)
    );

// Logic for the ping command
export async function execute(interaction: CommandInteraction) {
    // Retrieve the corresponding event from the database
    const event = await db.query.events.findFirst({
        where: (table, { eq }) =>
            eq(table.password, `${interaction.options.get("password")?.value}`),
    });

    // Check if the event exists
    if (!event) {
        return interaction.reply({
            content: "Event not found",
            ephemeral: true,
        });
    }

    // Check if this is a first time user
    const user = await db.query.eventUsers.findFirst({
        where: (table, { eq }) => eq(table.discord_id, interaction.user.id),
    });

    // If the user does not exist, create a new user. If they do, then update their information
    let result;
    if (!user) {
        // Respond with a success status
        return interaction.reply({
            content: "Please run /check_in to register with our event!",
            ephemeral: true,
        });
    } else {
        // Update the user's information, but first check if they exist
        // Check if the user has already signed in to this event
        const usersToEvent = await db
            .select()
            .from(usersToEvents)
            .where(
                and(
                    eq(usersToEvents.user_id, user.id),
                    eq(usersToEvents.event_id, event.id)
                )
            );
        console.log(usersToEvent.length);
        if (usersToEvent.length > 0) {
            return interaction.reply({
                content:
                    "Nice try, you've already signed in to this event... Don't make me deactivate safe mode >:[",
                ephemeral: true,
            });
        }

        result = await db
            .update(eventUsers)
            .set({
                username: interaction.user.username,
                num_attended: user.num_attended + 1,
                points: user.points + event.point_value,
            })
            .where(eq(eventUsers.discord_id, interaction.user.id))
            .returning();

        // Respond with a success status
        interaction.reply({
            content: "You're signed in!",
            ephemeral: true,
        });
    }
    // Update the event's number of attendees
    await db
        .update(events)
        .set({
            num_attended: event.num_attended + 1,
        })
        .where(eq(events.id, event.id));

    // Update users_to_events table
    const userId = result[0].id;
    const eventId = event.id;

    try {
        await db.insert(usersToEvents).values({
            user_id: result[0].id,
            event_id: event.id,
        });
    } catch (err) {
        console.log(err);
    }
}
