/* eslint-disable @typescript-eslint/no-misused-promises -- Cron job callback can't return promises*/
import { EmbedBuilder, WebhookClient } from "discord.js";
import JIMP from "jimp";
import cron from "node-cron";

import { getGoatEmbed } from "../commands/goat";
import { TK_CAPYBARA_URL, TK_CAT_URL, TK_DUCK_URL } from "../consts";
import { env } from "../env";

// various hook props
interface CatProps {
  url: string;
}

interface CapybaraProps {
  data: CapybaraDataProps;
}

// for deeper access to capybara url
interface CapybaraDataProps {
  url: string;
}

interface DuckProps {
  message: string;
  url: string;
}

export function execute() {
  const webhook = new WebhookClient({
    url: env.DISCORD_ANIMAL_WEBHOOK_URL,
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
  const url = TK_CAT_URL;

  try {
    cron.schedule("0 13 * * *", async () => {
      const res = await fetch(url);
      const data = (await res.json()) as CatProps[];

      if (data[0]?.url) {
        const catEmbed = await createEmbed(data[0].url, "Daily Cat!");
        return webhook.send({
          embeds: [catEmbed],
        });
      } else {
        console.error("Cat image URL is undefined");
      }
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error(err.message);
    } else {
      console.error("An unknown error occurred: ", err);
    }
  }
}

function capybaraHook(webhook: WebhookClient) {
  const url = TK_CAPYBARA_URL;

  try {
    cron.schedule("30 13 * * *", async () => {
      const res = await fetch(url);
      const data = (await res.json()) as CapybaraProps;

      const capyEmbed = await createEmbed(data.data.url, "Daily Capybara!");

      return webhook.send({
        embeds: [capyEmbed],
      });
    });
  } catch (err) {
    if (err instanceof Error) {
      console.error(err.message);
    } else {
      console.error("An unknown error occurred: ", err);
    }
  }
}

function duckHook(webhook: WebhookClient) {
  const url = TK_DUCK_URL;

  try {
    cron.schedule("0 14 * * *", async () => {
      const res = await fetch(url);
      const data = (await res.json()) as DuckProps;

      const duckEmbed = await createEmbed(data.url, "Daily Duck!");

      return webhook.send({
        embeds: [duckEmbed],
      });
    });
  } catch (err) {
    if (err instanceof Error) {
      console.error(err.message);
    } else {
      console.error("An unknown error occurred: ", err);
    }
  }
}

function goatHook(webhook: WebhookClient) {
  try {
    cron.schedule("30 14 * * *", async () => {
      const embed = await getGoatEmbed();
      void webhook.send({ embeds: [embed] });
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error(err.message);
    } else {
      console.error("An unknown error occurred: ", err);
    }
  }
}
