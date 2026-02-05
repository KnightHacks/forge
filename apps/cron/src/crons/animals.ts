import type { APIEmbed } from "discord-api-types/v10";
import { WebhookClient } from "discord.js";
import { eq } from "drizzle-orm";
import natural from "natural";
import sharp from "sharp";

import { db } from "@forge/db/client";
import { Permissions } from "@forge/db/schemas/auth";
import { Member } from "@forge/db/schemas/knight-hacks";

import { env } from "../env";
import { CronBuilder } from "../structs/CronBuilder";

const { LevenshteinDistance, Metaphone } = natural;

const CAPYBARA_URL = "https://api.capy.lol/v1/capybara?json=true";
const CAT_URL = "https://api.thecatapi.com/v1/images/search?limit=1";
const DUCK_URK = "https://random-d.uk/api/v2/quack";
const ANIMAL_WEBHOOK = new WebhookClient({ url: env.DISCORD_WEBHOOK_ANIMAL });

export const cat = new CronBuilder({
  name: "animal/cat",
  cronExpression: "0 13 * * *",
  color: 1,
}).addExecutor(async () => {
  const res = await fetch(CAT_URL);
  const data = (await res.json()) as { url: string }[];

  if (!data[0]) throw new Error("API returned empty");

  const embed = await createEmbed(data[0].url, "Daily Cat!");

  await ANIMAL_WEBHOOK.send({ embeds: [embed] });
});

export const capybara = new CronBuilder({
  name: "animal/capybara",
  cronExpression: "30 13 * * *",
  color: 1,
}).addExecutor(async () => {
  const res = await fetch(CAPYBARA_URL);
  const { data } = (await res.json()) as { data: { url: string } };

  if (!data.url) throw new Error("API returned empty");

  const embed = await createEmbed(data.url, "Daily Capybara!");

  await ANIMAL_WEBHOOK.send({ embeds: [embed] });
});

export const duck = new CronBuilder({
  name: "animal/duck",
  cronExpression: "0 14 * * *",
  color: 1,
}).addExecutor(async () => {
  const res = await fetch(DUCK_URK);
  const data = (await res.json()) as { url: string };

  const embed = await createEmbed(data.url, "Daily Duck!");

  await ANIMAL_WEBHOOK.send({ embeds: [embed] });
});

export const goat = new CronBuilder({
  name: "animal/GOAT",
  cronExpression: "30 14 * * *",
  color: 1,
}).addExecutor(async () => {
  const allGoats = await db
    .select({
      firstName: Member.firstName,
      lastName: Member.lastName,
      githubProfileUrl: Member.githubProfileUrl,
      websiteUrl: Member.websiteUrl,
      linkedinProfileUrl: Member.linkedinProfileUrl,
      profilePictureUrl: Member.profilePictureUrl,
      guildProfileVisible: Member.guildProfileVisible,
    })
    .from(Member)
    .innerJoin(Permissions, eq(Permissions.userId, Member.userId))
    .where(eq(Member.guildProfileVisible, true));

  const goatsShuffled = allGoats.sort(() => Math.random() - 0.5);
  const goat = goatsShuffled.find((member) => {
    return member.profilePictureUrl?.trim();
  });

  if (!goat?.profilePictureUrl?.trim())
    throw new Error("No valid goat profile found");

  const url = [
    goat.websiteUrl,
    goat.linkedinProfileUrl,
    goat.githubProfileUrl,
  ].find((u) => u?.trim());

  const name = replaceName(`${goat.firstName} ${goat.lastName}`);
  console.log("goat chosen: ", name);

  const embed = await createEmbed(
    goat.profilePictureUrl,
    name,
    url ?? undefined,
  );

  await ANIMAL_WEBHOOK.send({ embeds: [embed] });
});

async function createEmbed(imageUrl: string, title: string, titleUrl?: string) {
  const response = await fetch(imageUrl);
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

  const embed: APIEmbed = {
    title: title,
    url: titleUrl,
    image: { url: imageUrl },
    color: parseInt(hexString, 16),
  };

  return embed;
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
  const vowels = "aeiouy";
  const result: string[] = [];
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
