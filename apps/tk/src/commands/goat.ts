import type { CommandInteraction } from "discord.js";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import natural from "natural";

const { LevenshteinDistance, Metaphone } = natural;

import { db } from "@forge/db/client";
import sharp from 'sharp';

// GOAT COMMAND
// random G.O.A.T. image

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
    console.log({ syl, sylPhonetic, replacementPhonetic, distance });
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

export const data = new SlashCommandBuilder()
  .setName("goat")
  .setDescription("G.O.A.T...");

export async function execute(interaction: CommandInteraction) {
  try {
    const goat_ids: string[] = (
      await db.query.Permissions.findMany({
        columns: {
          userId: true,
        },
      })
    ).map((t) => t.userId);

    console.log(goat_ids);

    let goat_id = "";
    let goat:
      | {
          firstName: string;
          lastName: string;
					githubProfileUrl: string | null,
					websiteUrl: string | null,
          linkedinProfileUrl: string | null,
          profilePictureUrl: string | null;
        }
      | undefined;

    while (!goat?.profilePictureUrl?.trim()) {
      goat_id = goat_ids[Math.floor(Math.random() * goat_ids.length)];
      goat = await db.query.Member.findFirst({
        where: (t, { eq }) => eq(t.userId, goat_id),
        columns: {
          firstName: true,
          lastName: true,
					githubProfileUrl: true,
					websiteUrl: true,
          linkedinProfileUrl: true,
          profilePictureUrl: true,
        },
      });
      console.log(goat_id, goat);
    }

    console.log(goat_id, goat);

		const response = await fetch(goat.profilePictureUrl);
		const buffer = await response.arrayBuffer();

		const { data, info } = await sharp(Buffer.from(buffer))
		.raw()
		.toBuffer({ resolveWithObject: true });

		const width = info.width;
		const height = info.height;
		const pixelIndex = ((Math.floor(height / 2) * width) + Math.floor(width / 2)) * info.channels;

		const r = data[pixelIndex];
		const g = data[pixelIndex + 1];
		const b = data[pixelIndex + 2];
		
		if(!r || !g || !b) throw new Error("Couldn't find mid pixel");

		const hexString = `${((1 << 24) + (r << 16) + (g << 8) + b)
			.toString(16)
			.slice(1)
			.toUpperCase()}`;

		const url = [
			goat.websiteUrl,
			goat.linkedinProfileUrl,
			goat.githubProfileUrl,
		].find(u => typeof u === "string" && u.trim().length > 0);

    const embed = new EmbedBuilder()
      .setTitle(replaceName(goat.firstName + " " + goat.lastName))
      .setImage(goat.profilePictureUrl)
			.setColor(`#${hexString}`);

		if(url) embed.setURL(url);

    void interaction.reply({ embeds: [embed] });
  } catch (err: unknown) {
    if (err instanceof Error) console.error(err.message);
    else console.error("An unknown error occurred: ", err);
  }
}

