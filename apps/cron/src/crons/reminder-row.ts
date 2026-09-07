import type { APIEmbed } from "discord-api-types/v10";

import { EVENTS } from "@forge/consts";

interface ReminderEvent {
  name: string;
  location: string;
  startDateTime: Date | string;
  endDateTime: Date | string;
  url: string | null;
  emoji?: string | null;
  requiresDues?: boolean;
}

function label(value: string, limit: number) {
  const characters = Array.from(value.replace(/\s+/g, " ").trim());
  const text =
    characters.length > limit
      ? `${characters.slice(0, limit - 1).join("")}…`
      : characters.join("");
  return text
    .replaceAll("@", "@\u200b")
    .replace(/([\\`*_[\]{}()~|>])/g, "\\$1");
}

function time(value: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
    timeZone: EVENTS.CALENDAR_TIME_ZONE,
  }).format(new Date(value));
}

export function reminderEventRow(event: ReminderEvent) {
  const name = label(event.name, 100);
  const title = event.url ? `[${name}](<${event.url}>)` : name;
  const emoji = event.emoji ? `${label(event.emoji, 32)} ` : "";
  const details = [
    `${time(event.startDateTime)}–${time(event.endDateTime)}`,
    label(event.location, 80),
    event.requiresDues ? "**DUES REQUIRED**" : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return `${emoji}**${title}**\n-# ${details}`;
}

export function reminderEventEmbed(
  event: ReminderEvent & { description: string },
  footer?: string,
): APIEmbed {
  return {
    color: 0xcca4f4,
    description: event.description.slice(0, 4096),
    fields: [
      {
        inline: true,
        name: "Date",
        value: new Intl.DateTimeFormat("en-US", {
          dateStyle: "full",
          timeZone: EVENTS.CALENDAR_TIME_ZONE,
        }).format(new Date(event.startDateTime)),
      },
      {
        inline: true,
        name: "Location",
        value: event.location.slice(0, 1024) || "\u200b",
      },
      { name: "\u200b", value: "\u200b" },
      { inline: true, name: "Start", value: time(event.startDateTime) },
      { inline: true, name: "End", value: time(event.endDateTime) },
      ...(event.requiresDues
        ? [
            {
              name: "\u200b",
              value: "**DUES REQUIRED**",
            },
          ]
        : []),
      ...(footer ? [{ name: "\u200b", value: footer }] : []),
    ],
    thumbnail: { url: "https://i.imgur.com/Jr1cyxT.png" },
    title: [event.emoji, event.name].filter(Boolean).join(" ").slice(0, 256),
    ...(event.url ? { url: event.url } : {}),
  };
}
