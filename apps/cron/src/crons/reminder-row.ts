import { EVENTS } from "@forge/consts";

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

export function reminderEventRow(event: {
  name: string;
  location: string;
  startDateTime: Date | string;
  endDateTime: Date | string;
  url: string | null;
  emoji?: string | null;
  requiresDues?: boolean;
}) {
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
