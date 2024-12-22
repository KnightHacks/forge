import type { CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "discord.js";

// FACT COMMAND
// GET FACTS

interface FactProps {
    text: string;
}

export const data = new SlashCommandBuilder()
    .setName("fact")
    .setDescription("Replies with a fact!");

const url = "https://uselessfacts.jsph.pl/api/v2/facts/random?language=en";
export async function execute(interaction: CommandInteraction) {
    try {
        const res = await fetch(url);

        if (!res.ok) {
            if (res.status == 429) {
                throw new Error("Too many requests made! Please try again later");
            } else {
                throw new Error("HTTP Error!");
            }
        }

        const data = (await res.json()) as FactProps;

        if (!data.text) {
            throw new Error("Facts could not be fetched!");
        }

        data.text = data.text.replaceAll('`', "'");
        // this escape is needed for output into discord.

        return interaction.reply(data.text);
    } catch (err: unknown) {
        if (err instanceof Error) {
            console.log(err.message);
        } else {
            console.error("An unknown error occurred: ", err);
        }
    } 
} 