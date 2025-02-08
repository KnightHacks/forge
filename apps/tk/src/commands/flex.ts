import type { CommandInteraction } from "discord.js";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";

import { db } from "@forge/db/client";

// SIGN IN EVENT COMMAND
// Command to sign into an event

// Create the command
export const data = new SlashCommandBuilder()
  .setName("flex")
  .setDescription("Check the event leaderboard");

export async function execute(interaction: CommandInteraction) {
  // Create the event in the database
  const topMembers = await db.query.Member.findMany({
    orderBy: (users, { desc }) => [desc(users.points)],
    with: {
      user: true,
    },
    limit: 10,
  });
  const memberPlaces = topMembers.findIndex(
    (member) => member.user.discordUserId == interaction.user.id,
  );
  const currentMember = await db.query.User.findFirst({
    where: (t, { eq }) => eq(t.name, interaction.user.username),
    with: {
      member: true,
    },
  });

  const memberPoints = currentMember?.member ? currentMember.member.points : 0;
  let counter = 1;
  const embed = new EmbedBuilder()
    .setTitle("**Leaderboard**")
    .setDescription(
      `${topMembers
        .map(
          (member) =>
            `${counter++}. ${member.user.name} - ${member.points} points`,
        )
        .join("\n")}\n\n**${
        memberPlaces == -1 ? "Unranked" : memberPlaces + 1
      }. ${interaction.user.username} - ${memberPoints} points**`,
    )
    .setFooter({
      text: "Maybe the real Knight Hacks were the friends we made along the way...",
    })
    .setColor(0x33e0ff);
  // Respond with a success status
  return interaction.reply({ embeds: [embed] });
}
