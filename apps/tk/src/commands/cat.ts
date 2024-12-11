import { 
    CommandInteraction, 
    EmbedBuilder, 
    SlashCommandBuilder, 
} from "discord.js";
import fetch from "node-fetch";
import JIMP from "jimp";

// CAT COMMAND
// interface for returned data from the API
interface CatProps {
    url: string,
} 

export const data = new SlashCommandBuilder()
    .setName("cat")
    .setDescription("Meow!");
   

const url = "https://api.thecatapi.com/v1/images/search?limit=1";
export async function execute(interaction: CommandInteraction) {
    try {
        const res = await fetch(url);
        const data = (await res.json()) as CatProps[];

        // this code takes in the image and gets the main color of it.
        const img = JIMP.read(data[0].url);
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
            .setImage(data[0].url)
            .setColor(`#${hexString}`);
        interaction.reply({ embeds: [embed] });

        // checks the joke type and uses the correct params based on that
        // check the api docs for more info 
        // (https://developers.thecatapi.com/view-account/ylX4blBYT9FaoVd6OhvR?report=bOoHBz-8t)

    // catch any errors
    } catch (err: unknown) {
        // silences eslint. type safety with our errors basically
        err instanceof Error ? 
            console.error(err.message) : 
            console.error("An unknown error occurred: ", err);
    }
}
