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
