import type { CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "discord.js";

const cases = [
  ["0", "👊"],
  ["2", "✌️"],
  ["5", "🤚"],
];

const win = new Set(["0,2", "2,5", "5,0"]);

export const data = new SlashCommandBuilder()
  .setName("rock")
  .setDescription("Rock, paper, scissors.")
  .addStringOption((option) =>
    option
      .setName("player1-choice")
      .setDescription("Your move.")
      .setRequired(true)
      .addChoices(
        { name: "👊 | Rock", value: "0" },
        { name: "✌️ | Scissors", value: "2" },
        { name: "🤚 | Paper", value: "5" },
      ),
  )
  .addStringOption((option) =>
    option.setName("player2").setDescription("Your opponent").setRequired(true),
  );

export async function execute(interaction: CommandInteraction) {
  if (!interaction.isChatInputCommand()) {
    throw new Error("Interaction is of the wrong type");
  }

  const p2 = Math.floor(Math.random() * 3);
  const player1Info = interaction.user.id;
  const player2Info = interaction.options.getString("player2");
  if (!player2Info?.includes("@")) {
    return interaction.reply("Please specify a user and try again.");
  }
  const player1ChoiceStr = interaction.options.getString("player1-choice");
  if (!player1ChoiceStr) {
    throw new Error("No hand found.");
  }
  const player1Choice = parseInt(player1ChoiceStr, 10);
  const player1Case = cases.find(([v]) => v === String(player1Choice));
  const player2Case = cases[p2];

  if (!player1Case || !player2Case?.[0]) {
    throw new Error("No hand found.");
  }

  let playResponse: string;
  const player2CaseVal = player2Case[0];
  if (player1Choice === parseInt(player2CaseVal, 10)) {
    playResponse = "Tied";
  } else if (win.has(`${player1Case[0]},${player2CaseVal}`)) {
    playResponse = `<@${player1Info}> wins!`;
  } else {
    playResponse = `${player2Info} wins!`;
  }
  return interaction.reply(
    `<@${player1Info}>: ${player1Case[1]}\n${player2Info}: ${player2Case[1]}\n\n${playResponse}`,
  );
}
