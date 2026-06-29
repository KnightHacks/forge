import type { APIEmbed } from "discord-api-types/v10";

const CLUB_TIME_ZONE = "America/New_York";
const DISCORD_PROD_GUILD_ID = "486628710443778071";
const DISCORD_REMINDER_ROLE_ID = "1264770451578552401";
const EVENT_BANNER_IMAGE = "https://i.imgur.com/Jr1cyxT.png";

export interface ClubReminderCandidate {
  description: string;
  discordId: string;
  endDateTime: string | Date;
  id: string;
  location: string;
  name: string;
  startDateTime: string | Date;
  tag: string;
}

type ReminderPayload = string | { content: string } | { embeds: APIEmbed[] };

function dateKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: CLUB_TIME_ZONE,
    year: "numeric",
  }).formatToParts(value);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function dateKeyAfter(value: Date, days: number) {
  const [year, month, day] = dateKey(value).split("-").map(Number);
  const next = new Date(
    Date.UTC(year ?? 0, (month ?? 1) - 1, (day ?? 1) + days, 12),
  );
  return next.toISOString().slice(0, 10);
}

function dateFromKey(key: string) {
  return new Date(`${key}T12:00:00Z`);
}

function weekday(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CLUB_TIME_ZONE,
    weekday: "long",
  }).format(value);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeZone: CLUB_TIME_ZONE,
  }).format(value);
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
    timeZone: CLUB_TIME_ZONE,
  }).format(value);
}

function groupCandidates(candidates: ClubReminderCandidate[], now: Date) {
  const isSunday = weekday(now) === "Sunday";
  const today = dateKey(now);
  const tomorrow = dateKeyAfter(now, 1);
  const weekFromToday = dateKeyAfter(now, 7);
  const sundayWindowEnd = dateKeyAfter(now, 6);
  const groups = new Map<string, ClubReminderCandidate[]>();

  for (const event of candidates) {
    const start = new Date(event.startDateTime);
    const eventDate = dateKey(start);
    let key: string | undefined;

    if (isSunday) {
      if (eventDate >= today && eventDate <= sundayWindowEnd) {
        key = weekday(start);
      }
    } else if (eventDate === today) {
      key = "Today";
    } else if (eventDate === tomorrow) {
      key = "Tomorrow";
    } else if (eventDate === weekFromToday) {
      const tag = event.tag.toLowerCase();
      const name = event.name.toLowerCase();
      const isOperations = tag === "ops";
      const isProjectLaunchLab =
        tag === "project launch" &&
        (name.includes("lab") || name.includes("hours"));

      if (!isOperations && !isProjectLaunchLab) key = "Next Week";
    }

    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }

  return [...groups.entries()].map(([prefix, events]) => ({ prefix, events }));
}

function eventEmbed(event: ClubReminderCandidate): APIEmbed {
  const start = new Date(event.startDateTime);
  const end = new Date(event.endDateTime);
  return {
    author: {
      name: `[${event.tag.toUpperCase().replaceAll(" ", "-")}]`,
    },
    color: 0xcca4f4,
    description: event.description,
    fields: [
      { inline: true, name: "Date", value: formatDate(start) },
      { inline: true, name: "Location", value: event.location },
      { name: "\t", value: "\t" },
      { inline: true, name: "Start", value: formatTime(start) },
      { inline: true, name: "End", value: formatTime(end) },
    ],
    thumbnail: { url: EVENT_BANNER_IMAGE },
    title: event.name,
    url: `https://discord.com/events/${DISCORD_PROD_GUILD_ID}/${event.discordId}`,
  };
}

export function createClubReminderExecutor({
  getCandidates,
  now,
  send,
}: {
  getCandidates: (input: { now: Date }) => Promise<ClubReminderCandidate[]>;
  now: () => Date;
  send: (payload: ReminderPayload) => Promise<unknown>;
}) {
  return async () => {
    const currentTime = now();
    const candidates = await getCandidates({ now: currentTime });
    const groups = groupCandidates(candidates, currentTime);
    if (groups.length === 0) return;

    const sunday = weekday(currentTime) === "Sunday";
    if (sunday) {
      const end = dateFromKey(dateKeyAfter(currentTime, 6));
      const range = `${new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "numeric",
        timeZone: CLUB_TIME_ZONE,
      }).format(currentTime)} - ${new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "numeric",
        timeZone: CLUB_TIME_ZONE,
      }).format(end)}`;
      await send({
        content: `# Events this Week (${range})\nWe hope you've had an amazing weekend so far, @everyone :D\nHere are some of the events planned for this week!`,
      });
    } else {
      await send({
        content: `# Event Reminders\nGood morning, <@&${DISCORD_REMINDER_ROLE_ID}>!\nToday is ${formatDate(currentTime)}, and here are some reminders about upcoming events!`,
      });
    }

    for (const group of groups) {
      await send(`## ${group.prefix}`);
      for (const event of group.events) {
        await send({ embeds: [eventEmbed(event)] });
      }
    }

    await send({
      content: `We hope to see you all there! Let us know you're attending an event by clicking its title and pressing "Interested"!\nIf you are interested in opting in to daily event reminders, please assign yourself the Event Reminders role in <id:customize>!\nAlso, please make sure to sign up to [Blade](https://blade.knighthacks.org) for membership management and check-in to events!`,
    });
  };
}
