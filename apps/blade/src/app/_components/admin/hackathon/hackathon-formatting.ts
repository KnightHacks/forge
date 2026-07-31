/**
 * `datetime-local` marshalling for the hackathon form.
 *
 * Display formatting lives in `@forge/email/fields`, beside the personalization
 * contract that promises pre-formatted dates — so what an officer previews and
 * what an applicant receives cannot drift. Only the form-field conversion is
 * Blade's concern, and it is re-exported here so callers have one import.
 */
export { formatHackathonDate } from "@forge/email/fields";

const HACKATHON_DATE_TIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
  timeZone: "UTC",
  timeZoneName: "short",
  year: "numeric",
});

export function formatHackathonDateTime(value: Date | string) {
  return HACKATHON_DATE_TIME_FORMAT.format(new Date(value));
}

/**
 * `datetime-local` wants `YYYY-MM-DDTHH:mm` with no zone, and reads it as local
 * time. The stored values are UTC, so the UTC parts are written out directly
 * rather than going through `toISOString().slice()` on a local-shifted date.
 */
export function toDateTimeLocalValue(value: Date | string) {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return [
    date.getUTCFullYear(),
    "-",
    pad(date.getUTCMonth() + 1),
    "-",
    pad(date.getUTCDate()),
    "T",
    pad(date.getUTCHours()),
    ":",
    pad(date.getUTCMinutes()),
  ].join("");
}

/** Inverse of {@link toDateTimeLocalValue}: reads the field back as UTC. */
export function fromDateTimeLocalValue(value: string) {
  return new Date(`${value}:00.000Z`);
}
