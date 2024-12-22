import type { CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "discord.js";

import { WEATHER_MAP } from "../consts";
import { env } from "../env";

interface WeatherProps {
    weather: {
        main: string;
        description: string;
    },
    main: {
        temp: number;
        feels_like: number;
        temp_min: number;
        temp_max: number;
        humidity: number;
    },
    sys: {
        country: string;
    },
    name: string;
}

export const data = new SlashCommandBuilder()
    .setName("weather")
    .setDescription("Gets you the weather for a specific city!")
    .addStringOption(option =>
        option
        .setName("city")
        .setDescription("Enter a city you want the weather for!")
        .setRequired(true)
    );

export async function execute(interaction: CommandInteraction) {
    const city = interaction.options.get("city")?.value;
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${env.DISCORD_WEATHER_API_KEY}&units=imperial`

    try {
        const res = await fetch(url);

        if (!res.ok) {
            throw new Error("HTTP Error!");
        }

        const data = (await res.json()) as WeatherProps;

        if (!data.name) {
            throw new Error("Weather data could not be fetched!");
        }

        const embed = {
            title: `Weather for ${data.name}, ${data.sys.country}`,

        }
    } catch (err: unknown) {
        if (err instanceof Error) {
            console.log(err.message);
        } else {
            console.error("An unknown error occurred: ", err);
        }
    }
}