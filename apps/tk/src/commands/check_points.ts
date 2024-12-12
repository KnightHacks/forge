import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { db } from "@forge/db/client";

// CHECK POINTS COMMAND
// Command to check your number of points

// Create the command
export const data = new SlashCommandBuilder()
  .setName("check_points")
  .setDescription("Replies with your number of points!");

// Logic for the check points command
export async function execute(interaction: CommandInteraction) {
  const user = await db.query.User.findFirst({
    // The "name" field in the User table is the user's Discord username
    where: (t, { eq }) => eq(t.name, interaction.user.username),
    // Grab the associated member data for the user
    with: { member: true },
  });

  if (!user) {
    return interaction.reply({
      content: "You have 0 points...",
      ephemeral: true,
    });
  }

  return interaction.reply({
    content: `You have ${user.member.points} points!`,
    ephemeral: true,
  });
}
