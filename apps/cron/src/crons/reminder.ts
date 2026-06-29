import type { APIEmbed } from "discord-api-types/v10";
import { WebhookClient } from "discord.js";

import { selectClubReminderCandidates } from "@forge/api/utils";
import { db } from "@forge/db/client";

import { env } from "../env";
import { CronBuilder } from "../structs/CronBuilder";
import { createClubReminderExecutor } from "./reminder-logic";

const REMINDERS_WEBHOOK = new WebhookClient({
  url: env.DISCORD_WEBHOOK_REMINDERS,
});
const REMINDERS_PRE_WEBHOOK = new WebhookClient({
  url: env.DISCORD_WEBHOOK_REMINDERS_PRE,
});
const HACK_REMINDERS_WEBHOOK = new WebhookClient({
  url: env.DISCORD_WEBHOOK_REMINDERS_HACK,
});

const DISCORD_PROD_GUILD_ID = "486628710443778071";
const HACK_BANNER_IMAGE = "https://i.imgur.com/lpTVNl7.png";
const DISCORD_HACKATHON_ROLE_ID = "1408025502119231498";

export const preReminders = new CronBuilder({
  name: "reminders/pre",
  color: 6,
}).addCron("0 8 * * *", genCronLogic(REMINDERS_PRE_WEBHOOK));

export const reminders = new CronBuilder({
  name: "reminders",
  color: 6,
}).addCron("0 11 * * *", genCronLogic(REMINDERS_WEBHOOK));

export const hackReminders = new CronBuilder({
  name: "reminders/hack",
  color: 6,
}).addCron("*/5 * * * *", async () => {
  const activeHackathon = await getHackathonActive();
  if (!activeHackathon) return;

  const hackathonEvents = await getHackEvents(activeHackathon.id);
  if (hackathonEvents.length === 0) return;

  await HACK_REMINDERS_WEBHOOK.send({
    content: `## ⚠️ Starting soon!\nAttention, <@&${DISCORD_HACKATHON_ROLE_ID}> hackers!\nThese events are starting in the next **15 minutes!**`,
  });

  for (const event of hackathonEvents) {
    const formattedTag = `[${event.tag.toUpperCase().replace(" ", "-")}]`;
    const discordEventURL = `https://discord.com/events/${DISCORD_PROD_GUILD_ID}/${event.discordId}`;
    const eventEmbed: APIEmbed = {
      author: { name: formattedTag },
      color: 0xc04b3d,
      description:
        event.description.length > 100
          ? `${event.description.substring(0, 100)}...`
          : event.description,
      fields: [
        { inline: true, name: "Location", value: event.location },
        {
          inline: true,
          name: "Time",
          value: `${formatHackTime(event.start_datetime)} - ${formatHackTime(event.end_datetime)}`,
        },
      ],
      thumbnail: { url: HACK_BANNER_IMAGE },
      title: event.name,
      url: discordEventURL,
    };

    await HACK_REMINDERS_WEBHOOK.send({ embeds: [eventEmbed] });
  }

  await HACK_REMINDERS_WEBHOOK.send({
    content: `We'll see you there! **Don't forget your lanyard and your Blade QR code!**`,
  });
});

function genCronLogic(webhook: WebhookClient): () => Promise<void> {
  return createClubReminderExecutor({
    getCandidates: selectClubReminderCandidates,
    now: () => new Date(),
    send: (payload) => webhook.send(payload),
  });
}

function formatHackTime(value: Date) {
  return value.toLocaleString("en-US", {
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
  });
}

async function getHackathonActive() {
  const endCompDate = new Date();
  endCompDate.setHours(23, 59, 59, 999);

  return await db.query.Hackathon.findFirst({
    orderBy: (hackathon, { asc }) => asc(hackathon.endDate),
    where: (hackathon, { and, gte, lte }) =>
      and(
        gte(hackathon.endDate, endCompDate),
        lte(hackathon.startDate, new Date()),
      ),
  });
}

async function getHackEvents(hackathonId: string) {
  const events = (
    await db.query.Event.findMany({
      orderBy: (event, { asc }) => asc(event.start_datetime),
      where: (event, { and, eq, sql }) =>
        and(
          eq(event.hackathonId, hackathonId),
          eq(event.isOperationsCalendar, false),
          sql`array_length(${event.roles}, 1) IS NULL`,
        ),
    })
  )
    .filter((event) => {
      // Hackathon events retain the legacy date offset until their event flow is rebuilt.
      const adjustedStart = new Date(
        event.start_datetime.getTime() + 24 * 60 * 60 * 1000,
      );
      const minutesUntilStart = (adjustedStart.getTime() - Date.now()) / 60000;
      return minutesUntilStart <= 16 && minutesUntilStart >= 14;
    })
    .map((event) => ({
      ...event,
      end_datetime: new Date(
        event.end_datetime.getTime() + 24 * 60 * 60 * 1000,
      ),
      start_datetime: new Date(
        event.start_datetime.getTime() + 24 * 60 * 60 * 1000,
      ),
    }));

  return events;
}
