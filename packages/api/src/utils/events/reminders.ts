import type { EventDiscoveryRecord } from "./discovery";

function selectClubReminderCandidatesFromRows(
  events: readonly EventDiscoveryRecord[],
  { now }: { now: Date },
) {
  return events
    .flatMap((event) => {
      const discordId = event.discord.id;
      const effectiveVisibility = [
        {
          audience: event.audience,
          internal: event.internal,
          roleIds: event.roleIds,
        },
        event.synchronizedVisibility,
      ].filter(
        (
          visibility,
        ): visibility is {
          audience: "dues" | "public" | "roles";
          internal: boolean;
          roleIds: string[];
        } => visibility !== null,
      );
      return event.hackathonId === null &&
        !event.legacy &&
        event.publishedAt !== null &&
        event.deletionIntentAt === null &&
        effectiveVisibility.every(
          (visibility) =>
            !visibility.internal && visibility.audience !== "roles",
        ) &&
        event.endAt > now &&
        discordId !== null &&
        event.discord.state === "synced" &&
        event.discord.appliedRevision === event.revision
        ? [{ event, discordId }]
        : [];
    })
    .sort(
      (left, right) =>
        left.event.startAt.getTime() - right.event.startAt.getTime() ||
        left.event.id.localeCompare(right.event.id),
    )
    .map(({ discordId, event }) => ({
      description: event.description,
      discordId,
      endDateTime: event.endAt.toISOString(),
      id: event.id,
      location: event.location,
      name: event.name,
      startDateTime: event.startAt.toISOString(),
      tag: event.tag,
    }));
}

export function selectClubReminderCandidates(
  events: readonly EventDiscoveryRecord[],
  options: { now: Date },
): ReturnType<typeof selectClubReminderCandidatesFromRows>;
export function selectClubReminderCandidates(options: {
  now: Date;
}): Promise<ReturnType<typeof selectClubReminderCandidatesFromRows>>;
export function selectClubReminderCandidates(
  eventsOrOptions: readonly EventDiscoveryRecord[] | { now: Date },
  options?: { now: Date },
) {
  if (Array.isArray(eventsOrOptions)) {
    if (!options) throw new Error("Reminder selection requires a clock.");
    return selectClubReminderCandidatesFromRows(eventsOrOptions, options);
  }
  const reminderOptions = eventsOrOptions as { now: Date };
  return import("./queries").then(async ({ loadReminderClubEventRecords }) =>
    selectClubReminderCandidatesFromRows(
      await loadReminderClubEventRecords(reminderOptions.now),
      reminderOptions,
    ),
  );
}
