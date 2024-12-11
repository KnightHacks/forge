import {
    CommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder
} from "discord.js";
import fetch from "node-fetch";
import JIMP from "jimp";

// CAPYBARA COMMAND
//  interface for returned data from API
interface CapybaraProps {
    data: CapybaraDataProps;
};

// for deeper access to capybara url
interface CapybaraDataProps {
    url: string;
}

export const data = new SlashCommandBuilder()
    .setName("capybara")
    .setDescription("Capybara noises!");

const url = "https://api.capy.lol/v1/capybara?json=true";
export async function execute(interaction: CommandInteraction) {
    try {
        const res = await fetch(url);
        const data = (await res.json()) as CapybaraProps;

        // get the average color of the img, make it the embed color
        const img = JIMP.read(data.data.url);
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
            .setImage(data.data.url)
            .setColor(`#${hexString}`
            );
        interaction.reply({ embeds: [embed] });
        // catch any errors
    } catch (err: unknown) {
        // silences eslint. type safety with our errors basically
        err instanceof Error ? 
            console.error(err.message) : 
            console.error("An unknown error occurred: ", err);
    }
}
