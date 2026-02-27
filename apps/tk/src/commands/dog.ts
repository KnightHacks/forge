import type { CommandInteraction } from "discord.js";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Jimp as JIMP } from "jimp";

import { TK_DOG_URL } from "../consts";

// DOG COMMAND
// interface for returned data from API
interface DogProps {
  message: string;
}

export const data = new SlashCommandBuilder()
  .setName("dog")
  .setDescription("Bark!");

const url = TK_DOG_URL;
export async function execute(interaction: CommandInteraction) {
  try {
    const res = await fetch(url);
    const data = (await res.json()) as DogProps;

    // gets the average color of the image and makes it the embed color
    const img = await JIMP.read(data.message);
    const { width, height } = img;
    const color = img.getPixelColor(Math.floor(width / 2), Math.floor(height / 2));

    const r = (color >> 24) & 0xff;
    const g = (color >> 16) & 0xff;
    const b = (color >> 8) & 0xff;

    const hexString = `${((1 << 24) + (r << 16) + (g << 8) + b)
      .toString(16)
      .slice(1)
      .toUpperCase()}`;
    const embed = new EmbedBuilder()
      .setImage(data.message)
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
