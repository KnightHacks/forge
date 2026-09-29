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
  if (!interaction.isChatInputCommand()) {
    throw new Error("Interaction is of the wrong type");
  }

  const p1 = Math.floor(Math.random() * 3);
  const p2 = Math.floor(Math.random() * 3);
  const player1Info = interaction.user.id;
  const player2Info = interaction.options.getString("player2", true);

  // Do not start the game if the input does not mention a user (@user)
  if (!player2Info.includes("@")) {
    return interaction.reply("Please specify a user and try again.");
  }

  const player1Case = cases[p1];
  const player2Case = cases[p2];
  if (!player1Case || !player2Case) {
    throw new Error("No hand found.");
  }

  let playResponse: string;
  if (p1 === p2) {
    playResponse = "Tied";
  } else if (win.has(`${player1Case[0]},${player2Case[0]}`)) {
    playResponse = `<@${player1Info}> wins!`;
  } else {
    playResponse = `${player2Info} wins!`;
  }
  return interaction.reply(
    `<@${player1Info}>: ${player1Case[1]}\n${player2Info}: ${player2Case[1]}\n\n${playResponse}`,
  );
}
