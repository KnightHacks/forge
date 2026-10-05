import type { HackerScheduleDto } from "@forge/hacker-sdk/contracts";

/** Compare instants, including overnight events; an event ends exclusively. */
export function getCurrentEvents(
  events: HackerScheduleDto["events"],
  now: number,
) {
  return events
    .filter(
      (event) =>
        Date.parse(event.startAt) <= now && now < Date.parse(event.endAt),
    )
    .sort((left, right) => Date.parse(left.endAt) - Date.parse(right.endAt));
}
