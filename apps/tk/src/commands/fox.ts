import type { CommandInteraction } from "discord.js";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import JIMP from "jimp";

import { TK_FOX_URL } from "../consts";

// FOX COMMAND
// interface for returned data from API
interface FoxProps {
  image: string;
}

export const data = new SlashCommandBuilder()
  .setName("fox")
  .setDescription("What does the fox say?");

const url = TK_FOX_URL;
export async function execute(interaction: CommandInteraction) {
  try {
    const res = await fetch(url);
    const data = (await res.json()) as FoxProps;

    const img = JIMP.read(data.image);
    const width = (await img).getWidth(),
      height = (await img).getHeight();
    const color = (await img).getPixelColor(width / 2, height / 2);

    const r = (color >> 24) & 0xff;
    const g = (color >> 16) & 0xff;
    const b = (color >> 8) & 0xff;

    const hexString = `${((1 << 24) + (r << 16) + (g << 8) + b)
      .toString(16)
      .slice(1)
      .toUpperCase()}`;
    const embed = new EmbedBuilder()
      .setImage(data.image)
      .setColor(`#${hexString}`);
    void interaction.reply({ embeds: [embed] });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error(err.message);
    } else {
      console.error("An unknown error occurred: ", err);
    }
  }
}
