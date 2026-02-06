import type { APIThreadChannel } from "discord-api-types/v10";
import { Routes, ThreadAutoArchiveDuration } from "discord-api-types/v10";
import { WebhookClient } from "discord.js";

import { discord } from "@forge/api/utils";

import { env } from "../env";
import { CronBuilder } from "../structs/CronBuilder";

const DISCORD_LEETCODE_ROLE_ID = "1264645162060091483";
const LEETCODE_WEBHOOK = new WebhookClient({
  url: env.DISCORD_WEBHOOK_LEETCODE,
});

const LEETCODE_API_URL = "https://alfa-leetcode-api.onrender.com/daily";
const LEETCODE_ICON_URL =
  "https://assets.leetcode.com/static_assets/public/images/LeetCode_logo_rvs.png";

const DAILY_MESSAGES = [
  "Try not to TLE this time!",
  "Let's hope it's not a graph network flow DP problem...",
  "Don't use ChatGPT this time!",
  "👅",
  "May the bugs ever be in your favor!",
  "Don't use C for this one...",
  "Let's see who comes out victorious!",
  "Let's crack it together!",
  "Time to debug the day away!",
  "Today's challenge awaits!",
  "Let's code circles around Neetcode!",
  "Let's get to hacking!",
  "May your algorithms be swift and your bugs be minimal!",
  "Take a shower after this...",
  "Let's flex your brain muscles! 💪👅😈",
  "𝓛𝓮𝓽'𝓼 𝓬𝓸𝓭𝓮 𝓿𝓻𝓸 ❤️‍🔥⛓️👅",
  "I'm 𝓯𝓻𝓮𝓪𝓴𝔂 T.K! 🛡️👅",
];

export const leetcode = new CronBuilder({
  name: "leetcode",
  color: 5,
  cronExpression: "0 12 * * *",
}).addExecutor(async () => {
  const problem = await fetchData();

  const date = problem.date.split("-");
  const dateString = date[1] + "/" + date[2] + "/" + date[0];

  const problemEmbed = {
    color: 0x33e0ff, // https://www.color-hex.com/color/33e0ff
    title: `${problem.questionFrontendId}. ${problem.questionTitle}`,
    url: problem.questionLink,
    author: {
      name: `Leetcode Daily for ${dateString}`,
      icon_url: LEETCODE_ICON_URL,
    },
    fields: [
      {
        name: "Difficulty",
        value: problem.difficulty,
        inline: true,
      },
      {
        name: "Likes",
        value: problem.likes.toString(),
        inline: true,
      },
      {
        name: "Dislikes",
        value: problem.dislikes.toString(),
        inline: true,
      },
      {
        name: "Topics",
        value: `${problem.topicTags
          .map((top) => {
            const topic = `${top.name}  -  *https://leetcode.com/tag/${top.slug}*`;
            return `||${topic}||`;
          })
          .join("\n")}`,
      },
    ],
  };

  const msg = await LEETCODE_WEBHOOK.send({
    content:
      `# Good Afternoon!\nHere's today's daily Leetcode problem! <@&${DISCORD_LEETCODE_ROLE_ID}>\n` +
      DAILY_MESSAGES[randInt(DAILY_MESSAGES.length)],
    embeds: [problemEmbed],
  });

  const thread = (await discord.post(Routes.threads(msg.channel_id, msg.id), {
    body: {
      name: dateString,
      auto_archive_duration: ThreadAutoArchiveDuration.OneDay,
    },
  })) as APIThreadChannel;

  await LEETCODE_WEBHOOK.send({
    content: "Make sure to wrap your solution with spoiler tags!",
    threadId: thread.id,
  });
});

interface DailyProblemProps {
  questionLink: string;
  questionTitle: string;
  difficulty: string;
  question: string;
  topicTags: {
    name: string;
    slug: string;
  }[];
  date: string;
  likes: number;
  dislikes: number;
  questionFrontendId: number;
  data: string;
}

const fetchData = async (): Promise<DailyProblemProps> => {
  const res = await fetch(LEETCODE_API_URL);

  if (!res.ok) throw new Error(`Leetcode API -> ${res.status}`);

  return (await res.json()) as DailyProblemProps;
};

const randInt = (max: number) => {
  return Math.floor(Math.random() * max);
};
