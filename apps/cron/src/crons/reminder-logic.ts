import type {
  APIContainerComponent,
  APIMessageTopLevelComponent,
  APITextDisplayComponent,
} from "discord-api-types/v10";
import {
  AllowedMentionsTypes,
  ComponentType,
  MessageFlags,
  SeparatorSpacingSize,
} from "discord-api-types/v10";

import { EVENTS } from "@forge/consts";
import { logger } from "@forge/utils";

import { reminderEventRow } from "./reminder-row";

const DISCORD_REMINDER_ROLE_ID = "1264770451578552401";
const REMINDER_FOOTER =
  "-# Note: show up with your Blade QR. Don’t have an account? [Sign up](<https://blade.knighthacks.org>)";

export interface ClubReminderCandidate {
  announcementChannelId?: string | null;
  emoji?: string | null;
  requiresDues?: boolean;
  skipNextWeek?: boolean;
  description: string;
  discordId: string;
  endDateTime: string | Date;
  id: string;
  location: string;
  name: string;
  startDateTime: string | Date;
  tag: string;
}

interface ReminderPayload {
  components: APIMessageTopLevelComponent[];
  flags: MessageFlags.IsComponentsV2;
  withComponents: true;
  allowedMentions: { parse: AllowedMentionsTypes[]; roles: string[] };
}

function dateKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: EVENTS.CALENDAR_TIME_ZONE,
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
    timeZone: EVENTS.CALENDAR_TIME_ZONE,
    weekday: "long",
  }).format(value);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeZone: EVENTS.CALENDAR_TIME_ZONE,
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
      if (!event.skipNextWeek) key = "Next Week";
    }

    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }

  return [...groups.entries()].map(([prefix, events]) => ({ prefix, events }));
}

function reminderCards(
  groups: ReturnType<typeof groupCandidates>,
  title: string,
  audience: string,
): APIContainerComponent[] {
  const sections: APITextDisplayComponent[] = [];
  for (const group of groups) {
    let content = "";
    for (const event of group.events) {
      const start = new Date(event.startDateTime);
      const date = new Intl.DateTimeFormat("en-US", {
        month: "numeric",
        day: "numeric",
        timeZone: EVENTS.CALENDAR_TIME_ZONE,
      }).format(start);
      const heading = `### ${group.prefix.toUpperCase()} · ${date}`;
      const row = reminderEventRow({
        ...event,
        url: `https://blade.knighthacks.org/member/events?selected=${encodeURIComponent(event.id)}`,
      });
      if (content && content.length + row.length + 2 > 2000) {
        sections.push({ type: ComponentType.TextDisplay, content });
        content = `${heading} · CONTINUED`;
      }
      if (!content) content = heading;
      content += `\n\n${row}`;
    }
    sections.push({ type: ComponentType.TextDisplay, content });
  }

  const cards: APIContainerComponent[] = [];
  let textLength = 0;
  for (const section of sections) {
    let card = cards.at(-1);
    // Reserve two children for the footer and its divider. Like issue reminders,
    // keep each text display <=2000, each container <=10 children, and total text <=6000.
    if (
      !card ||
      card.components.length === 8 ||
      textLength + section.content.length > 6000
    ) {
      const heading = `## ${title}${cards.length ? " (continued)" : ""}`;
      textLength =
        heading.length +
        REMINDER_FOOTER.length +
        (cards.length ? 0 : audience.length);
      card = {
        type: ComponentType.Container,
        accent_color: 0xcca4f4,
        components: [{ type: ComponentType.TextDisplay, content: heading }],
      };
      cards.push(card);
    }
    card.components.push(section);
    textLength += section.content.length;
  }
  for (const card of cards) {
    card.components.push(
      {
        type: ComponentType.Separator,
        divider: true,
        spacing: SeparatorSpacingSize.Small,
      },
      { type: ComponentType.TextDisplay, content: REMINDER_FOOTER },
    );
  }
  return cards;
}

export function createClubReminderExecutor({
  getCandidates,
  now,
  send,
}: {
  getCandidates: (input: { now: Date }) => Promise<ClubReminderCandidate[]>;
  now: () => Date;
  send: (
    payload: ReminderPayload,
    channelId?: string | null,
  ) => Promise<unknown>;
}) {
  return async () => {
    const currentTime = now();
    const candidates = await getCandidates({ now: currentTime });
    const destinations = new Map<string | null, ClubReminderCandidate[]>();
    for (const event of candidates) {
      const channelId = event.announcementChannelId ?? null;
      const events = destinations.get(channelId) ?? [];
      events.push(event);
      destinations.set(channelId, events);
    }

    const sunday = weekday(currentTime) === "Sunday";
    let title = `Event Reminders\n-# ${formatDate(currentTime)}`;
    if (sunday) {
      const end = dateFromKey(dateKeyAfter(currentTime, 6));
      const range = `${new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "numeric",
        timeZone: EVENTS.CALENDAR_TIME_ZONE,
      }).format(currentTime)} - ${new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "numeric",
        timeZone: EVENTS.CALENDAR_TIME_ZONE,
      }).format(end)}`;
      title = `Events this Week (${range})`;
    }

    const audience = `Want reminders like these, add the reminder role in <id:customize>\ncc: ${sunday ? "@everyone" : `<@&${DISCORD_REMINDER_ROLE_ID}>`}`;
    for (const [channelId, events] of destinations) {
      const groups = groupCandidates(events, currentTime);
      const cards = reminderCards(groups, title, audience);
      for (const [index, card] of cards.entries()) {
        const components: APIMessageTopLevelComponent[] = [card];
        if (index === 0)
          components.push({
            type: ComponentType.TextDisplay,
            content: audience,
          });
        try {
          await send(
            {
              components,
              flags: MessageFlags.IsComponentsV2,
              withComponents: true,
              allowedMentions: {
                parse:
                  sunday && index === 0 ? [AllowedMentionsTypes.Everyone] : [],
                roles: !sunday && index === 0 ? [DISCORD_REMINDER_ROLE_ID] : [],
              },
            },
            channelId,
          );
        } catch (error) {
          logger.error(
            `Failed to send Club reminder card "${title}" (part ${index + 1}, channel ${channelId ?? "default"}):`,
            error,
          );
        }
      }
    }
  };
}
