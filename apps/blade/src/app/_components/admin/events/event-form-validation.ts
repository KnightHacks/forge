import {
  EVENT_CREATION_MIN_LEAD_MS,
  EVENT_CREATION_START_MESSAGE,
} from "@forge/validators";

type NewYorkOffset = "-04:00" | "-05:00";

export function validNewYorkOffsets(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return [];
  return (["-04:00", "-05:00"] as const).filter((offset) => {
    const instant = new Date(`${value}:00${offset}`);
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        day: "2-digit",
        hour: "2-digit",
        hourCycle: "h23",
        minute: "2-digit",
        month: "2-digit",
        timeZone: "America/New_York",
        year: "numeric",
      })
        .formatToParts(instant)
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value]),
    );
    return (
      `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}` ===
      value
    );
  });
}

export function minimumEventCreationStartInput(now = new Date()) {
  const minimum = new Date(
    Math.ceil((now.getTime() + EVENT_CREATION_MIN_LEAD_MS) / 60_000) * 60_000,
  );
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
      minute: "2-digit",
      month: "2-digit",
      timeZone: "America/New_York",
      year: "numeric",
    })
      .formatToParts(minimum)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function validateEventCreationStart(
  value: string,
  selectedOffset?: NewYorkOffset,
  now = new Date(),
) {
  const validOffsets = validNewYorkOffsets(value);
  const offset =
    selectedOffset && validOffsets.includes(selectedOffset)
      ? selectedOffset
      : validOffsets.length === 1
        ? validOffsets[0]
        : undefined;
  if (!offset) return null;
  const start = Date.parse(`${value}:00${offset}`);
  return start < now.getTime() + EVENT_CREATION_MIN_LEAD_MS
    ? EVENT_CREATION_START_MESSAGE
    : null;
}
