import {
    WebhookClient,
    EmbedBuilder,
    ChannelType,
    ThreadAutoArchiveDuration,
    Client,
} from "discord.js";
import { client } from "../index";
import fetch from "node-fetch";
import cron from "node-cron";
import { DAILY_MESSAGES } from "../consts";
import { config } from "../config";

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

// Leetcode API Endpoint and Channel ID
const url = "https://alfa-leetcode-api.onrender.com/daily";
// const channelId = "1263954540089180231";

// Function to fetch the Daily Problem
const fetchData = async (url: string): Promise<DailyProblemProps> => {
    try {
        const res = await fetch(url);

        if (!res.ok) {
            throw new Error(`Error: ${res.status}`);
        }

        const data = (await res.json()) as DailyProblemProps;
        return data;
    } catch (err) {
        console.log(`Error: ${err}`);
        throw err;
    }
};

const randInt = (max: number) => {
    return Math.floor(Math.random() * max);
};

// Leetcode Daily Problem Webhook
export async function execute(client: Client) {
    // Create a new Webhook client instance using the DAILY webhook URL
    const webhook = new WebhookClient({
        url: config.DAILY_WEBHOOK_URL,
    });

    try {
        // Create a cron job that will run at 11:00 AM every day
        cron.schedule("0 11 * * *", async () => {
            // Fetch the problem data and format the data
            const problem = (await fetchData(url)) as DailyProblemProps;
            const date = problem.date.split("-");
            const dateString = date[1] + "/" + date[2] + "/" + date[0];

            // Create an embed message for aesthetics
            const problemEmbed = new EmbedBuilder()
                .setColor(0x33e0ff)
                .setTitle(
                    `${problem.questionFrontendId}. ${problem.questionTitle}`
                )
                .setURL(problem.questionLink)
                .setAuthor({
                    name: `Leetcode Daily for ${dateString}`,
                    iconURL:
                        "https://assets.leetcode.com/static_assets/public/images/LeetCode_logo_rvs.png",
                })
                .addFields(
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
                                return `${top.name}  -  *https://leetcode.com/tag/${top.slug}*`;
                            })
                            .join("\n")}`,
                    }
                );

            //ROLE ID has to be hardcoded into the ping!
            const embed = await webhook.send({
                content:
                    `# Good Morning!\nHere's today's daily Leetcode problem! <@&${config.DAILY_ROLE_ID}>\n` +
                    DAILY_MESSAGES[randInt(DAILY_MESSAGES.length)],
                embeds: [problemEmbed],
            });

            // We have 2 message types from 2 different packages
            // so we have to do this ..thing to convert it
            client.channels.fetch(embed.channel_id).then((channel) => {
                if (channel && channel.type === ChannelType.GuildText) {
                    channel.messages.fetch(embed.id).then(async (msg) => {
                        const thread = await msg.startThread({
                            name: dateString,
                            autoArchiveDuration:
                                ThreadAutoArchiveDuration.OneDay,
                        });

                        webhook.send({
                            content:
                                "Make sure to wrap your solution with spoiler tags!",
                            threadId: thread.id,
                        });
                    });
                }
            });
        });
    } catch (err: unknown) {
        // silences eslint. type safety with our errors basically
        err instanceof Error
            ? console.error(err.message)
            : console.error("An unknown error occurred: ", err);
    }
}
