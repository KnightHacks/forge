import type { APIEmbed } from "discord-api-types/v10";
import { WebhookClient } from "discord.js";
import JIMP from "jimp";
import natural from "natural";
import cron from "node-cron";
import sharp from "sharp";

import { db } from "@forge/db/client";

import { TK_CAPYBARA_URL, TK_CAT_URL, TK_DUCK_URL } from "../consts";
import { env } from "../env";

// TODO: make this pretty...
const { LevenshteinDistance, Metaphone } = natural;

const VALID_ONSETS = new Set([
  "b",
  "c",
  "d",
  "f",
  "g",
  "h",
  "j",
  "k",
  "l",
  "m",
  "n",
  "p",
  "r",
  "s",
  "t",
  "v",
  "w",
  "y",
  "z",
  "bl",
  "br",
  "cl",
  "cr",
  "dr",
  "fl",
  "fr",
  "gl",
  "gr",
  "pl",
  "pr",
  "sl",
  "sm",
  "sn",
  "sp",
  "st",
  "sw",
  "tr",
  "tw",
]);

function splitSyllables(word: string) {
  word = word.toLowerCase();
  const vowels = "aeiouy";
  const result = [];
  let i = 0;

  while (i < word.length) {
    const start = i;

    while (i < word.length && !vowels.includes(word[i] ?? "")) i++;
    if (i < word.length) i++;

    const cStart = i;
    while (i < word.length && !vowels.includes(word[i] ?? "")) i++;
    const cluster = word.slice(cStart, i);

    let split = cluster.length;
    while (split > 0 && !VALID_ONSETS.has(cluster.slice(0, split))) {
      split--;
    }

    result.push(word.slice(start, cStart + split));
    i = cStart + split;
  }

  return result;
}

function replaceSimilarSyllable(name: string, replacement: string) {
  const metaphone = new Metaphone();

  const syllables: string[] = splitSyllables(name);
  const replacementPhonetic = metaphone.process(replacement);

  let bestIndex = 0;
  let bestScore = Infinity;

  syllables.forEach((syl: string, i: number) => {
    const sylPhonetic = metaphone.process(syl);
    const distance = LevenshteinDistance(sylPhonetic, replacementPhonetic);
    if (distance < bestScore) {
      bestScore = distance;
      bestIndex = i;
    }
  });

  syllables[bestIndex] = replacement;
  return { word: syllables.join(""), bestScore };
}

function replaceName(name: string, word = "GOAT") {
  let bestScore = Infinity;
  let bestIdx = -1;

  const words = name.split(" ").map((w, idx) => {
    const rep = replaceSimilarSyllable(w, word);
    if (rep.bestScore <= bestScore) {
      bestScore = rep.bestScore;
      bestIdx = idx;
    }
    let name = rep.word;
    name = name[0]?.toUpperCase() + name.slice(1);
    return name;
  });

  const replaced = name
    .split(" ")
    .map((w, i) => (i == bestIdx ? words[i] : w))
    .join(" ");

  return replaced;
}

export const getGoatEmbed = async () => {
  const goat_ids: string[] = (
    await db.query.Permissions.findMany({
      columns: {
        userId: true,
      },
    })
  ).map((t) => t.userId);

  let goat_id = "";
  let goat:
    | {
        firstName: string;
        lastName: string;
        githubProfileUrl: string | null;
        websiteUrl: string | null;
        linkedinProfileUrl: string | null;
        profilePictureUrl: string | null;
      }
    | undefined;

  while (!goat?.profilePictureUrl?.trim()) {
    goat_id = goat_ids[Math.floor(Math.random() * goat_ids.length)] ?? "";
    const member = await db.query.Member.findFirst({
      where: (t, { eq }) => eq(t.userId, goat_id),
      columns: {
        firstName: true,
        lastName: true,
        githubProfileUrl: true,
        websiteUrl: true,
        linkedinProfileUrl: true,
        profilePictureUrl: true,
        guildProfileVisible: true,
      },
    });

    if (!member) continue;
    const { guildProfileVisible, ...rest } = member;
    if (guildProfileVisible) goat = rest;
  }

  const response = await fetch(goat.profilePictureUrl);
  const buffer = await response.arrayBuffer();

  const { data, info } = await sharp(Buffer.from(buffer))
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const pixelIndex =
    (Math.floor(height / 2) * width + Math.floor(width / 2)) * info.channels;

  const r = data[pixelIndex];
  const g = data[pixelIndex + 1];
  const b = data[pixelIndex + 2];

  if (r === undefined || g === undefined || b === undefined)
    throw new Error("Couldn't find mid pixel");

  const hexString = `${((1 << 24) + (r << 16) + (g << 8) + b)
    .toString(16)
    .slice(1)
    .toUpperCase()}`;

  const url = [
    goat.websiteUrl,
    goat.linkedinProfileUrl,
    goat.githubProfileUrl,
  ].find((u) => typeof u === "string" && u.trim().length > 0);

  const embed: APIEmbed = {
    title: replaceName(goat.firstName + " " + goat.lastName),
    image: { url: goat.profilePictureUrl },
    color: parseInt(hexString, 16),
  };

  if (url) embed.url = url;

  return embed;
};

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
    url: env.DISCORD_WEBHOOK_ANIMAL,
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

  const embed: APIEmbed = {
    title: title,
    image: { url: imageUrl },
    color: parseInt(hexString, 16),
  };

  return embed;
}

function catHook(webhook: WebhookClient) {
  const url = TK_CAT_URL;

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  cron.schedule("0 13 * * *", async () => {
    const res = await fetch(url);
    const data = (await res.json()) as CatProps[];

    if (!data[0]) {
      console.error("Cat response is empty");
      return;
    }

    const catEmbed = await createEmbed(data[0].url, "Daily Cat!");
    return webhook.send({
      embeds: [catEmbed],
    });
  });
}

function capybaraHook(webhook: WebhookClient) {
  const url = TK_CAPYBARA_URL;

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  cron.schedule("30 13 * * *", async () => {
    const res = await fetch(url);
    const data = (await res.json()) as CapybaraProps;

    const capyEmbed = await createEmbed(data.data.url, "Daily Capybara!");

    return webhook.send({
      embeds: [capyEmbed],
    });
  });
}

function duckHook(webhook: WebhookClient) {
  const url = TK_DUCK_URL;

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  cron.schedule("0 14 * * *", async () => {
    const res = await fetch(url);
    const data = (await res.json()) as DuckProps;

    const duckEmbed = await createEmbed(data.url, "Daily Duck!");

    return webhook.send({
      embeds: [duckEmbed],
    });
  });
}

function goatHook(webhook: WebhookClient) {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  cron.schedule("30 14 * * *", async () => {
    const embed = await getGoatEmbed();
    void webhook.send({ embeds: [embed] });
  });
}
