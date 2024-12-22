import type { CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "discord.js";

import { CHAT_RESPONSES } from "../consts";

// CHAT COMMAND
// Chat with T.K

// Create the command
export const data = new SlashCommandBuilder()
  .setName("chat")
  .setDescription("Talk to T.K!");

// Logic for the ping command
export async function execute(interaction: CommandInteraction) {
  // Send back a random chat response
  const randomIndex = Math.floor(Math.random() * CHAT_RESPONSES.length);

  if (!CHAT_RESPONSES[randomIndex]) {
    throw new Error("No chat response found.");
  }

  return interaction.reply(CHAT_RESPONSES[randomIndex]);
}
