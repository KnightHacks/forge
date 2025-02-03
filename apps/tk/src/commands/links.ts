import type { CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "discord.js";

import { LINKS, TK_KNIGHTHACKS_LINKTREE_URL } from "../consts";

/* command that returns an embed with our important links
+ linktree link */

export const data = new SlashCommandBuilder()
  .setName("links")
  .setDescription("Replies with a list of our links!");

export async function execute(interaction: CommandInteraction) {
  const embed = {
    title: "Links",
    url: TK_KNIGHTHACKS_LINKTREE_URL,
    description: "Click any of these links to get started with KnightHacks!",
    color: 0x33e0ff,
    fields: [
      {
        name: "Our Popular Links:",
        value: LINKS.join("\n"),
      },
    ],
  };

  // send the embedded message
  await interaction.reply({ embeds: [embed] });
}
