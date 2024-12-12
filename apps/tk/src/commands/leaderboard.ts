import {
  CommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";
import { db } from "@forge/db/client";
// SIGN IN EVENT COMMAND
// Command to sign into an event

// Create the command
export const data = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("Check the event leaderboard");

// TODO: fix implementation
export async function execute(interaction: CommandInteraction) {
  // // Create the event in the database
  // const topMembers = await db.query.Member.findMany({
  //   orderBy: (users, { desc }) => [desc(users.points)],
  //   with: {
  //     user: true,
  //   },
  //   limit: 10,
  // });
  // const curUserPlace = topMembers.findIndex(
  //   (member) => member.discord_id == interaction.user.id
  // );
  // const curUserPoints = curUserPlace == -1 ? 0 : topMembers[curUserPlace].points;
  // let counter = 1;
  // const embed = new EmbedBuilder()
  //   .setTitle("**Leaderboard**")
  //   .setDescription(
  //     `${topMembers
  //       .map((user) => `${counter++}. ${user.username} - ${user.points} points`)
  //       .join("\n")}\n\n**${
  //       curUserPlace == -1 ? "Unranked" : curUserPlace + 1
  //     }. ${interaction.user.username} - ${curUserPoints} points**`
  //   )
  //   .setFooter({
  //     text: "Maybe the real Knight Hacks were the friends we made along the way...",
  //   })
  //   .setColor(0x33e0ff);
  // // Respond with a success status
  // return interaction.reply({ embeds: [embed], ephemeral: true });
}
