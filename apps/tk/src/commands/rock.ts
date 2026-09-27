import type { CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "discord.js";

// All possible cases
const cases = [
  ["0", "👊"],
  ["2", "✌️"],
  ["5", "🤚"],
];


// Scenarios that Player 1 wins
const win = new Set(["0,2", "2,5", "5,0"]);

export const data = new SlashCommandBuilder()
  .setName("rock")
  .setDescription("Rock, paper, scissors.")
  .addStringOption((option) =>
    option.setName("player2").setDescription("Your opponent").setRequired(true),
  );

export async function execute(interaction: CommandInteraction) {
  const p1 = Math.floor(Math.random() * 3);
  const p2 = Math.floor(Math.random() * 3);
  const player1Info = interaction.user.id;
  const player2Info = interaction.options.getString("player2");

  // Do not start the game if the input does not mention a user (@user)
  if (!player2Info.includes("@")) {
    return interaction.reply("Please specify a user and try again.");
  }

  let playResponse = "";
  if (p1 === p2) {
    playResponse = "Tied";
  } else if (win.has(`${cases[p1][0]},${cases[p2][0]}`)) {
    playResponse = `<@${player1Info}> wins!`;
  } else {
    playResponse = `${player2Info} wins!`;
  }
  return interaction.reply(
    `<@${player1Info}>: ${cases[p1][1]}\n${player2Info}: ${cases[p2][1]}\n\n${playResponse}`,
  );
}
