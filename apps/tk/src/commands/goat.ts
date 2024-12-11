import {
    CommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";
import JIMP from "jimp";
import { GOATS } from "../consts";

// GOAT COMMAND
// random G.O.A.T. image

export const data = new SlashCommandBuilder()
    .setName("goat")
    .setDescription("G.O.A.T...");

export async function execute(interaction: CommandInteraction) {
    try {
        const goat = GOATS[Math.floor(Math.random() * GOATS.length)];
        const img = JIMP.read(goat.image);
        const width = (await img).getWidth(),
            height = (await img).getHeight();
        const color = (await img).getPixelColor(width / 2, height / 2);

        // this code sets the color of the embed to the main color of the image
        const r = (color >> 24) & 0xff;
        const g = (color >> 16) & 0xff;
        const b = (color >> 8) & 0xff;

        const hexString = `${((1 << 24) + (r << 16) + (g << 8) + b)
            .toString(16)
            .slice(1)
            .toUpperCase()}`;
        const embed = new EmbedBuilder()
            .setTitle(goat.name)
            .setURL(goat.link)
            .setImage(goat.image)
            .setColor(`#${hexString}`);
        interaction.reply({ embeds: [embed] });
    } catch (err: unknown) {
        // silences eslint. type safety with our errors basically
        err instanceof Error ? 
            console.error(err.message) : 
            console.error("An unknown error occurred: ", err);
    }
}
