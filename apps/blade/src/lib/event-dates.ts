export const EVENT_TIME_ZONE = "America/New_York";

export function formatEventDateTime(value: Date | string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: EVENT_TIME_ZONE,
  }).format(date);
}

export function localNewYorkDateTime(
  value: string,
  selectedOffset?: "-04:00" | "-05:00",
) {
  if (/[-+]\d{2}:\d{2}$/.test(value)) return value;
  const normalized = value.length === 16 ? `${value}:00` : value;
  const wallTime = normalized.slice(0, 19);
  const validOffsets = (["-04:00", "-05:00"] as const).filter((offset) => {
    const candidate = `${wallTime}${offset}`;
    const parts = new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
      minute: "2-digit",
      month: "2-digit",
      second: "2-digit",
      timeZone: EVENT_TIME_ZONE,
      year: "numeric",
    }).formatToParts(new Date(candidate));
    const values = Object.fromEntries(
      parts
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value]),
    );
    return (
      `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}` ===
      wallTime
    );
  });
  if (validOffsets.length === 0) {
    throw new Error("Choose a valid America/New_York date and time.");
  }
  if (validOffsets.length > 1 && !selectedOffset) {
    throw new Error(
      "Choose the first or second occurrence of the repeated time.",
    );
  }
  const offset = selectedOffset ?? validOffsets[0];
  if (!offset || !validOffsets.includes(offset)) {
    throw new Error("Choose a valid occurrence for the repeated time.");
  }
  return `${wallTime}${offset}`;
}
