import type { CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "discord.js";

import { EIGHTBALL_RESPONSES } from "../consts";

export const data = new SlashCommandBuilder()
  .setName("eightball")
  .setDescription("Ask, and you shall receive.")
  .addStringOption((option) =>
    option
      .setName("question")
      .setDescription("Input your question!")
      .setRequired(true),
  ); // to simulate real input of a question

export async function execute(interaction: CommandInteraction) {
  // send a random eight ball response
  const randomIndex = Math.floor(Math.random() * EIGHTBALL_RESPONSES.length);

  if (!EIGHTBALL_RESPONSES[randomIndex]) {
    throw new Error("No eightball response found.");
  }

  return interaction.reply(EIGHTBALL_RESPONSES[randomIndex]);
}
