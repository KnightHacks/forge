import {
    WebhookClient,
    EmbedBuilder
} from "discord.js";
import fetch from "node-fetch";
import cron from "node-cron";
import { config } from "../config";
import JIMP from "jimp";
import { GOATS } from "../consts";
import { Client } from "discord.js";

// various hook props
interface CatProps {
    url: string,
} 

interface CapybaraProps {
    data: CapybaraDataProps;
};

// for deeper access to capybara url
interface CapybaraDataProps {
    url: string;
}

interface DuckProps {
    message: string;
    url: string;
}

export async function execute(client: Client) {
    const webhook = new WebhookClient({
        url: config.ANIMAL_WEBHOOK_URL,
    });


    catHook(webhook);
    capybaraHook(webhook);
    duckHook(webhook);
    goatHook(webhook);
}

// for any hooks that require fetching an image.
async function createEmbed(imageUrl: string, title: string) {
    // get the average color of the img, make it the embed color
    const img = JIMP.read(imageUrl);
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
        .setTitle(title)
        .setImage(imageUrl)
        .setColor(`#${hexString}`);

    return embed;
}

function catHook(webhook: WebhookClient) {
    const url = "https://api.thecatapi.com/v1/images/search?limit=1";
    
    try {
        cron.schedule("0 13 * * *", async () => {
            const res = await fetch(url);
            const data = (await res.json()) as CatProps[];

            const catEmbed = await createEmbed(
                data[0].url, "Daily Cat!"
            );
            
            return webhook.send({
                embeds: [catEmbed]
            });
        });
    } catch (err: unknown) {
        // silences eslint. type safety with our errors basically
        err instanceof Error ? 
            console.error(err.message) : 
            console.error("An unknown error occurred: ", err);
    }
}

function capybaraHook(webhook: WebhookClient) {
    const url = "https://api.capy.lol/v1/capybara?json=true";

    try {
        cron.schedule("30 13 * * *", async () => {
            const res = await fetch(url);
            const data = (await res.json()) as CapybaraProps;

            const capyEmbed = await createEmbed(
                data.data.url, "Daily Capybara!"
            );
            
            return webhook.send({
                embeds: [capyEmbed]
            });
        });
    } catch (err) {
        err instanceof Error ? 
            console.error(err.message) : 
            console.error("An unknown error occurred: ", err);
    }
}

function duckHook(webhook: WebhookClient) {
    const url = "https://random-d.uk/api/v2/quack";

    try {
        cron.schedule("0 14 * * *", async () => {
            const res = await fetch(url);
            const data = (await res.json()) as DuckProps;

            const duckEmbed = await createEmbed(
                data.url, "Daily Duck!"
            );

            return webhook.send({
                embeds: [duckEmbed]
            });
        });
    } catch (err) {
        err instanceof Error ?
            console.error(err.message) :
            console.error("An unknown error occurred: ", err);
    }
}

async function goatHook(webhook: WebhookClient) {
    try {
        cron.schedule("30 14 * * *", async () => {
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
                .setAuthor({
                    name: "Daily G.O.A.T!"
                })
                .setImage(goat.image)
                .setColor(`#${hexString}`);
            webhook.send({ embeds: [embed] });
        });
    } catch (err: unknown) {
        err instanceof Error ?
            console.error(err.message) :
            console.error("An unknown error occurred: ", err);
    }
}