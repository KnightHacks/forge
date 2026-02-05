// TODO: remove WebhookClient
import type { APIThreadChannel } from "discord-api-types/v10";
import { Routes, ThreadAutoArchiveDuration } from "discord-api-types/v10";
import { WebhookClient } from "discord.js";
import cron from "node-cron";

import { discord } from "@forge/api/utils";

import {
  DAILY_MESSAGES,
  DISCORD_LEETCODE_ROLE_ID,
  TK_LEETCODE_API_URL,
  TK_LEETCODE_ICON_URL,
} from "../consts";
import { env } from "../env";

// Daily Problem Interface
interface DailyProblemProps {
  questionLink: string;
  questionTitle: string;
  difficulty: string;
  question: string;
  topicTags: Topic[];
  date: string;
  likes: number;
  dislikes: number;
  questionFrontendId: number;
  data: string;
}

// Topic Interfaces
interface Topic {
  name: string;
  slug: string;
}

// Function to fetch the Daily Problem
const fetchData = async (): Promise<DailyProblemProps> => {
  try {
    const res = await fetch(TK_LEETCODE_API_URL);

    if (!res.ok) {
      throw new Error(`Error: ${res.status}`);
    }

    const data = (await res.json()) as DailyProblemProps;
    return data;
  } catch (err) {
    if (err instanceof Error) console.log(`Error: ${err}`);
    throw err;
  }
};

const randInt = (max: number) => {
  return Math.floor(Math.random() * max);
};

export function execute() {
  const webhook = new WebhookClient({
    url: env.DISCORD_WEBHOOK_LEETCODE,
  });

  // every day @ noon
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  cron.schedule("0 13 * * *", async () => {
    const problem = await fetchData();

    const date = problem.date.split("-");
    const dateString = date[1] + "/" + date[2] + "/" + date[0];

    const problemEmbed = {
      color: 0x33e0ff,
      title: `${problem.questionFrontendId}. ${problem.questionTitle}`,
      url: problem.questionLink,
      author: {
        name: `Leetcode Daily for ${dateString}`,
        icon_url: TK_LEETCODE_ICON_URL,
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

    const msg = await webhook.send({
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

    await webhook.send({
      content: "Make sure to wrap your solution with spoiler tags!",
      threadId: thread.id,
    });
  });
}
