import { 
    CommandInteraction, 
    SlashCommandBuilder, 
} from "discord.js";
import fetch from "node-fetch";

interface JokeProps {
    type: string,
    joke: string,
    setup: string,
    delivery: string,
} // joke type for the json that's returned

export const data = new SlashCommandBuilder()
    .setName("joke")
    .setDescription("Tells a joke!");
    // metadata for the joke command

const url = "https://v2.jokeapi.dev/joke/Programming?blacklistFlags=nsfw,religious,political,racist,sexist,explicit"; // keep it clean
export async function execute(interaction: CommandInteraction) {
    try {
        const res = await fetch(url);
        const data = await res.json() as JokeProps;

        // checks the joke type and uses the correct params based on that
        // check the api docs for more info (https://sv443.net/jokeapi/v2/)
        if (data.type === "single") { 
            return interaction.reply(data.joke);
        } else if (data.type === "twopart") {
            return interaction.reply(data.setup + "\n" + data.delivery);
        }
    } catch (err: unknown) {
        // silences eslint. type safety with our errors basically
        err instanceof Error ? 
            console.error(err.message) : 
            console.error("An unknown error occurred: ", err);
    }
}
