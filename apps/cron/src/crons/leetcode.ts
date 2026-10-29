import type { APIThreadChannel } from "discord-api-types/v10";
import { Routes, ThreadAutoArchiveDuration } from "discord-api-types/v10";
import { WebhookClient } from "discord.js";

import { logger } from "@forge/utils";
import * as discord from "@forge/utils/discord";

import { env } from "../env";
import { CronBuilder } from "../structs/CronBuilder";

const DISCORD_LEETCODE_ROLE_ID = "1264645162060091483";
const LEETCODE_WEBHOOK = new WebhookClient({
  url: env.DISCORD_WEBHOOK_LEETCODE,
});

// LeetCode's own site uses this endpoint; it needs no key for public problem data.
// We previously went through alfa-leetcode-api, a shared wrapper that rate limits
// all of its users together and returned 429s at noon.
const LEETCODE_URL = "https://leetcode.com";
const LEETCODE_GRAPHQL_URL = `${LEETCODE_URL}/graphql`;
const DAILY_QUERY = `query {
  activeDailyCodingChallengeQuestion {
    date
    link
    question {
      questionFrontendId
      title
      difficulty
      likes
      dislikes
      topicTags { name slug }
    }
  }
}`;
// Delays before the 2nd and 3rd attempts.
const RETRY_DELAYS_MS = [30_000, 120_000];
const FETCH_TIMEOUT_MS = 15_000;
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
  "Lock in!",
  "Time to use 101% of your brain power! 🧠",
  "Time to beat 100% submissions with your algorithms!",
  "1337 1337 1337...",
  "Rise up, coding people!",
  "Tuff problem, you got this tho.",
  "Leetcodemaxxing time 🥶",
];

export const leetcode = new CronBuilder({
  name: "leetcode",
  color: 5,
}).addCron(
  "0 12 * * *", // noon every day
  async () => {
    // Only the fetch is retried; retrying the webhook send could double-post.
    const problem = await fetchDailyWithRetry();

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

    const thread = (await discord.api.post(
      Routes.threads(msg.channel_id, msg.id),
      {
        body: {
          name: dateString,
          auto_archive_duration: ThreadAutoArchiveDuration.OneDay,
        },
      },
    )) as APIThreadChannel;

    await LEETCODE_WEBHOOK.send({
      content: "Make sure to wrap your solution with spoiler tags!",
      threadId: thread.id,
    });
  },
);

interface TopicTag {
  name: string;
  slug: string;
}

interface DailyProblem {
  questionLink: string;
  questionTitle: string;
  difficulty: string;
  topicTags: TopicTag[];
  date: string;
  likes: number;
  dislikes: number;
  questionFrontendId: string;
}

interface DailyQueryResponse {
  data?: {
    activeDailyCodingChallengeQuestion?: {
      date: string;
      link: string;
      question: {
        questionFrontendId: string;
        title: string;
        difficulty: string;
        likes: number;
        dislikes: number;
        topicTags: TopicTag[];
      };
    } | null;
  } | null;
  errors?: { message: string }[];
}

class LeetcodeFetchError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

const fetchDailyWithRetry = async (): Promise<DailyProblem> => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetchDaily();
    } catch (error) {
      const delay = RETRY_DELAYS_MS[attempt - 1];
      // Unknown errors come from fetch itself (network failure or timeout), which are worth retrying.
      const retryable =
        !(error instanceof LeetcodeFetchError) || error.retryable;
      if (!retryable || delay === undefined) throw error;

      logger.warn(
        `attempt ${attempt} failed, retrying in ${delay / 1000}s:`,
        error,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

const fetchDaily = async (): Promise<DailyProblem> => {
  const res = await fetch(LEETCODE_GRAPHQL_URL, {
    method: "POST",
    // A stalled connection would otherwise hold up the retry for Node's ~5min default.
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      "Content-Type": "application/json",
      Referer: LEETCODE_URL,
      // Identify ourselves; anonymous requests are likelier to hit Cloudflare bot checks.
      "User-Agent":
        "KnightHacksForgeCron/1.0 (+https://github.com/KnightHacks/forge)",
    },
    body: JSON.stringify({ query: DAILY_QUERY }),
  });

  if (!res.ok) {
    throw new LeetcodeFetchError(
      `Leetcode API -> ${res.status}`,
      res.status === 429 || res.status >= 500,
    );
  }

  // Read the body outside the parse so a timeout here is still retried.
  const text = await res.text();
  let body: DailyQueryResponse;
  try {
    body = JSON.parse(text) as DailyQueryResponse;
  } catch {
    // e.g. a Cloudflare challenge page served with a 200.
    throw new LeetcodeFetchError(
      `Leetcode API -> invalid JSON (content-type: ${res.headers.get("content-type")})`,
      false,
    );
  }

  // Partial GraphQL results null out the failed fields, so any error fails the run.
  if (body.errors?.length) {
    throw new LeetcodeFetchError(
      `Leetcode API -> GraphQL errors: ${body.errors.map((e) => e.message).join("; ")}`,
      false,
    );
  }

  const daily = body.data?.activeDailyCodingChallengeQuestion;
  if (!daily) {
    throw new LeetcodeFetchError("Leetcode API -> no daily question", false);
  }

  return {
    questionLink: `${LEETCODE_URL}${daily.link}`,
    questionTitle: daily.question.title,
    difficulty: daily.question.difficulty,
    topicTags: daily.question.topicTags,
    date: daily.date,
    likes: daily.question.likes,
    dislikes: daily.question.dislikes,
    questionFrontendId: daily.question.questionFrontendId,
  };
};

const randInt = (max: number) => {
  return Math.floor(Math.random() * max);
};
