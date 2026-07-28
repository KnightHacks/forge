/**
 * Converts a `datetime-local` input value, which carries no timezone, into the
 * UTC instant the API expects. An empty input means "send now".
 */
export function dateTimeLocalToIso(value: string) {
  return value ? new Date(value).toISOString() : null;
}
