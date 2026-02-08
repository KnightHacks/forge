import type { APIEmbed } from "discord-api-types/v10";
import type { InferSelectModel } from "drizzle-orm";
import { WebhookClient } from "discord.js";
import { asc } from "drizzle-orm";

import { db } from "@forge/db/client";
import { Event } from "@forge/db/schemas/knight-hacks";

import { env } from "../env";
import { CronBuilder } from "../structs/CronBuilder";

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
const DISCORD_REMINDER_ROLE_ID = "1264770451578552401";
const EVENT_BANNER_IMAGE = "https://i.imgur.com/Jr1cyxT.png";
const HACK_BANNER_IMAGE = "https://i.imgur.com/lpTVNl7.png";
const DISCORD_HACKATHON_ROLE_ID = "1408025502119231498";

export const preReminders = new CronBuilder({
  name: "reminders/pre",
  color: 6,
}).addCron(
  "0 8 * * *", // 8am every day
  genCronLogic(REMINDERS_PRE_WEBHOOK),
);

export const reminders = new CronBuilder({
  name: "reminders",
  color: 6,
}).addCron(
  "0 11 * * *", // 11am every day
  genCronLogic(REMINDERS_WEBHOOK),
);

export const hackReminders = new CronBuilder({
  name: "reminders/hack",
  color: 6,
}).addCron(
  "*/5 * * * *", // every 5 minutes
  async () => {
    const activeHackathon = await getHackathonActive();
    if (!activeHackathon) return;

    const hackathonEvents = await getHackEvents(activeHackathon.id);
    if (hackathonEvents.length === 0) return;

    await HACK_REMINDERS_WEBHOOK.send({
      content: `## ⚠️ Starting soon!\nAttention, <@&${DISCORD_HACKATHON_ROLE_ID}> hackers!\nThese events are starting in the next **15 minutes!**`,
    });

    for (const event of hackathonEvents) {
      const formattedTag =
        "[" + event.tag.toUpperCase().replace(" ", "-") + "]";

      const discordEventURL =
        "https://discord.com/events/" +
        DISCORD_PROD_GUILD_ID +
        "/" +
        event.discordId;

      const eventEmbed: APIEmbed = {
        color: 0xc04b3d,
        title: event.name,
        description:
          event.description.length > 100
            ? event.description.substring(0, 100) + "..."
            : event.description,
        author: {
          name: `${formattedTag}`,
        },
        url: discordEventURL,
        fields: [
          {
            name: "Location",
            value: event.location,
            inline: true,
          },
          {
            name: "Time",
            value:
              new Date(
                new Date(event.start_datetime).setHours(
                  new Date(event.start_datetime).getHours(),
                ),
              ).toLocaleString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              }) +
              " - " +
              new Date(
                new Date(event.end_datetime).setHours(
                  new Date(event.end_datetime).getHours(),
                ),
              ).toLocaleString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              }),
            inline: true,
          },
        ],
        thumbnail: {
          url: HACK_BANNER_IMAGE,
        },
      };

      await HACK_REMINDERS_WEBHOOK.send({ embeds: [eventEmbed] });
    }

    await HACK_REMINDERS_WEBHOOK.send({
      content: `We'll see you there! **Don't forget your lanyard and your Blade QR code!**`,
    });
  },
);

/**
 * I think that this genCronLogic is the best way to handle
 * this. We need to be able to do the same logic for both
 * webhooks. So make a generator function.
 */
function genCronLogic(webhook: WebhookClient): () => Promise<void> {
  return async () => {
    // Events are grouped by weekday prefix
    const groupedPrefixes = await getEvents();
    const totalEvents = groupedPrefixes.reduce(
      (sum, group) => sum + group.events.length,
      0,
    );

    console.log(`Found a total of ${totalEvents} events`);
    for (const group of groupedPrefixes) {
      console.log(`Events for ${group.prefix}`);
      for (const event of group.events) {
        console.log(`Title: ${event.name}`);
      }
    }

    if (totalEvents === 0) return;

    // Sunday gets all events
    if (new Date().getDay() === 0) {
      const today = new Date();
      const nextSunday = new Date(today);
      nextSunday.setDate(today.getDate() + 6);

      const formattedDate = `${today.toLocaleDateString("en-US", {
        month: "numeric",
        day: "numeric",
      })} - ${nextSunday.toLocaleDateString("en-US", {
        month: "numeric",
        day: "numeric",
      })}`;

      await webhook.send({
        content: `# Events this Week (${formattedDate})\nWe hope you've had an amazing weekend so far, @everyone :D\nHere are some of the events planned for this week!`,
      });
    } else {
      const today = new Date();
      const formattedDate = today.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });

      await webhook.send({
        content: `# Event Reminders\nGood morning, <@&${DISCORD_REMINDER_ROLE_ID}>!\nToday is ${formattedDate}, and here are some reminders about upcoming events!`,
      });
    }

    // For each prefix group, send a line announcing the prefix, then send each event as an embed
    for (const group of groupedPrefixes) {
      await webhook.send(`## ${group.prefix}`);

      for (const event of group.events) {
        const formattedTag =
          "[" + event.tag.toUpperCase().replace(" ", "-") + "]";

        const discordEventURL =
          "https://discord.com/events/" +
          DISCORD_PROD_GUILD_ID +
          "/" +
          event.discordId;

        const eventEmbed: APIEmbed = {
          color: 0xcca4f4,
          title: event.name,
          author: {
            name: `${formattedTag}`,
          },
          url: discordEventURL,
          description: event.description,
          fields: [
            {
              name: "Date",
              value: event.start_datetime.toLocaleString("en-US", {
                dateStyle: "full",
              }),
              inline: true,
            },
            {
              name: "Location",
              value: event.location,
              inline: true,
            },
            {
              // Force next row
              name: "\t",
              value: "\t",
            },
            {
              name: "Start",
              value: new Date(
                new Date(event.start_datetime).setHours(
                  new Date(event.start_datetime).getHours(),
                ),
              ).toLocaleString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              }),
              inline: true,
            },
            {
              name: "End",
              value: new Date(
                new Date(event.end_datetime).setHours(
                  new Date(event.end_datetime).getHours(),
                ),
              ).toLocaleString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              }),
              inline: true,
            },
          ],
          thumbnail: {
            url: EVENT_BANNER_IMAGE,
          },
        };

        await webhook.send({ embeds: [eventEmbed] });
      }
    }

    await webhook.send({
      content: `We hope to see you all there! Let us know you're attending an event by clicking its title and pressing "Interested"!\nIf you are interested in opting in to daily event reminders, please assign yourself the Event Reminders role in <id:customize>!\nAlso, please make sure to sign up to [Blade](https://blade.knighthacks.org) for membership management and check-in to events!`,
    });
  };
}

async function getHackathonActive() {
  // Comparison date given that our DB end date will likely be at midnight
  const endCompDate = new Date(Date.now());
  endCompDate.setHours(23, 59, 59, 999);

  return await db.query.Hackathon.findFirst({
    orderBy: (t, { asc }) => asc(t.endDate),
    where: (t, { and, gte, lte }) =>
      and(gte(t.endDate, endCompDate), lte(t.startDate, new Date())),
  });
}

async function getEvents() {
  // If today is Sunday, return the events for the entire week
  if (new Date().getDay() === 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const fetchedEvents = await db
      .select()
      .from(Event)
      .orderBy(asc(Event.start_datetime));

    const eventsMap = fetchedEvents.map((event) => {
      const updatedStart = new Date(event.start_datetime);
      updatedStart.setDate(updatedStart.getDate() + 1);

      const updatedEnd = new Date(event.end_datetime);
      updatedEnd.setDate(updatedEnd.getDate() + 1);

      return {
        ...event,
        start_datetime: updatedStart,
        end_datetime: updatedEnd,
      };
    });

    const events = eventsMap.filter(
      (event) => event.end_datetime < nextWeek && event.start_datetime > today,
    );

    // 1) Add a weekday-based prefix to each event
    const eventsWithPrefix = events.map((event) => {
      const weekday = event.start_datetime.toLocaleString("en-US", {
        weekday: "long",
      });
      return {
        ...event,
        prefix: weekday, // e.g. "Monday", "Tuesday", etc.
      };
    });

    // 2) Group them by prefix
    const map = new Map<string, typeof eventsWithPrefix>();
    for (const event of eventsWithPrefix) {
      if (!map.has(event.prefix)) {
        map.set(event.prefix, []);
      }
      map.get(event.prefix)?.push(event);
    }

    // 3) Convert the Map into an array of { prefix, events[] }
    return [...map.entries()].map(([prefix, groupedEvents]) => ({
      prefix,
      events: groupedEvents,
    }));
  }

  // Otherwise (not Sunday): return three prefix groups (Today, Tomorrow, Next Week)

  // 1) Today's boundaries
  const today = new Date();

  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  // 2) Tomorrow’s boundaries
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const tomorrowStart = new Date(tomorrow);
  tomorrowStart.setHours(0, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(23, 59, 59, 999);

  // 3) Next Week’s boundaries
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const nextWeekStart = new Date(nextWeek);
  nextWeekStart.setHours(0, 0, 0, 0);

  const nextWeekEnd = new Date(nextWeek);
  nextWeekEnd.setHours(23, 59, 59, 999);

  // Query each batch
  const fetchEvents = await db
    .select()
    .from(Event)
    .orderBy(asc(Event.start_datetime));

  // Bandaid fix by adding one to every date
  const allEvents = fetchEvents.map((event) => {
    const updatedStart = new Date(event.start_datetime);
    updatedStart.setDate(updatedStart.getDate() + 1);

    const updatedEnd = new Date(event.end_datetime);
    updatedEnd.setDate(updatedEnd.getDate() + 1);

    return {
      ...event,
      start_datetime: updatedStart,
      end_datetime: updatedEnd,
    };
  });

  const todayEvents = allEvents.filter(
    (event) =>
      event.end_datetime < todayEnd && event.start_datetime >= todayStart,
  );

  console.log("Today's Events: ", todayEvents);

  const tomorrowEvents = allEvents.filter(
    (event) =>
      event.end_datetime < tomorrowEnd && event.start_datetime >= tomorrowStart,
  );

  console.log("Tomorrow's Events: ", tomorrowEvents);

  const nextWeekEvents = allEvents.filter(
    (event) =>
      event.end_datetime < nextWeekEnd && event.start_datetime >= nextWeekStart,
  );

  console.log("Next Week's Events: ", nextWeekEvents);

  // Filter out "Operations Meeting" from nextWeek
  const nextWeekFiltered = nextWeekEvents.filter(
    (event) =>
      !event.tag.includes("Operations Meeting") &&
      !event.name.includes("Lab Hours"),
  );

  // Build the final array of prefix groups
  type EventRow = InferSelectModel<typeof Event>;
  const prefixGroups: {
    prefix: string;
    events: (EventRow & { prefix: string })[];
  }[] = [];

  if (todayEvents.length > 0) {
    prefixGroups.push({
      prefix: "Today",
      events: todayEvents.map((evt) => ({ ...evt, prefix: "Today" })),
    });
  }

  if (tomorrowEvents.length > 0) {
    prefixGroups.push({
      prefix: "Tomorrow",
      events: tomorrowEvents.map((evt) => ({ ...evt, prefix: "Tomorrow" })),
    });
  }

  if (nextWeekFiltered.length > 0) {
    prefixGroups.push({
      prefix: "Next Week",
      events: nextWeekFiltered.map((evt) => ({
        ...evt,
        prefix: "Next Week",
      })),
    });
  }

  return prefixGroups;
}

async function getHackEvents(hId: string) {
  const events = (
    await db.query.Event.findMany({
      orderBy: (evs, { asc }) => asc(evs.start_datetime),
      where: (ev, { eq }) => eq(ev.hackathonId, hId),
    })
  )
    .filter((ev) => {
      // Add 1 day (24h) to both start and end before comparison
      const adjustedStart = new Date(
        ev.start_datetime.getTime() + 24 * 60 * 60 * 1000,
      );

      // minutes until adjusted event starts
      const start = (adjustedStart.getTime() - Date.now()) / 60000;

      // event must start in 15 minutes (±1 minute padding)
      return start <= 16 && start >= 14;
    })
    .map((ev) => ({
      // also return the adjusted times so later code uses the shifted values
      ...ev,
      start_datetime: new Date(
        ev.start_datetime.getTime() + 24 * 60 * 60 * 1000,
      ),
      end_datetime: new Date(ev.end_datetime.getTime() + 24 * 60 * 60 * 1000),
    }));

  return events;
}
