import type { CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "discord.js";

import { BUBBLE_WRAP_TEXT } from "../consts";

export const data = new SlashCommandBuilder()
  .setName("bubblewrap")
  .setDescription("Gives you some bubble wrap!");

export async function execute(interaction: CommandInteraction) {
  const NUM_ROWS = 8;

  await interaction.reply("Here you go!\n" + BUBBLE_WRAP_TEXT.repeat(NUM_ROWS));
}
