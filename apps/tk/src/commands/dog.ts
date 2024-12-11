import {
    CommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";
import fetch from "node-fetch";
import JIMP from "jimp";

// DOG COMMAND
// interface for returned data from API
interface DogProps {
    message: string,
};

export const data = new SlashCommandBuilder()
    .setName("dog")
    .setDescription("Bark!");

const url = "https://dog.ceo/api/breeds/image/random";
export async function execute(interaction: CommandInteraction) {
    try {
        const res = await fetch(url);
        const data = (await res.json()) as DogProps;

        // gets the average color of the image and makes it the embed color
        const img = JIMP.read(data.message);
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
            .setImage(data.message)
            .setColor(`#${hexString}`);
        interaction.reply({ embeds: [embed] });
    } catch (err: unknown) {
        // silences eslint. type safety with our errors basically
        err instanceof Error ? 
            console.error(err.message) : 
            console.error("An unknown error occurred: ", err);
    }
}