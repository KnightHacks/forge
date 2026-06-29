import { describe, expect, it } from "vitest";

import { selectClubReminderCandidates } from "../../utils/events/reminders";
import {
  EVENT_IDS,
  eventRecord,
  NOW,
  safeEventFixtureSet,
} from "../support/events/fixtures";

describe("Club reminder candidate selection", () => {
  it("[TC-028] selects only eligible Public and Dues-paying Club events", () => {
    const result = selectClubReminderCandidates(safeEventFixtureSet(), {
      now: NOW,
    });

    expect(result.map((event) => event.id)).toEqual([
      EVENT_IDS.public,
      EVENT_IDS.dues,
    ]);
    expect(result[0]).toEqual({
      description: "Build something useful.",
      discordId: "discord-event-1",
      endDateTime: "2026-07-02T00:00:00.000Z",
      id: EVENT_IDS.public,
      location: "ENG2 102",
      name: "TypeScript Workshop",
      startDateTime: "2026-07-01T22:00:00.000Z",
      tag: "Workshop",
    });
  });

  it("[TC-028] tolerates a later Google-only failure when Discord is current and healthy", () => {
    const event = eventRecord({
      discord: {
        appliedRevision: 2,
        id: "current-discord-id",
        state: "synced",
      },
      google: { appliedRevision: 1, state: "error" },
      revision: 2,
    });

    expect(selectClubReminderCandidates([event], { now: NOW })).toEqual([
      expect.objectContaining({
        discordId: "current-discord-id",
        id: event.id,
      }),
    ]);
  });

  it.each(["pending", "error", "unknown"] as const)(
    "[TC-028] suppresses a stored Discord ID in %s state",
    (state) => {
      const event = eventRecord({
        discord: {
          appliedRevision: 2,
          id: "stale-discord-id",
          state,
        },
        revision: 2,
      });

      expect(selectClubReminderCandidates([event], { now: NOW })).toEqual([]);
    },
  );

  it("[TC-028] suppresses missing and stale-revision Discord projections", () => {
    const missing = eventRecord({
      discord: { appliedRevision: null, id: null, state: "error" },
    });
    const stale = eventRecord({
      discord: { appliedRevision: 1, id: "old-discord-id", state: "synced" },
      revision: 2,
    });

    expect(
      selectClubReminderCandidates([missing, stale], { now: NOW }),
    ).toEqual([]);
  });

  it("[TC-028] preserves the corrected instant without a plus-one-day workaround", () => {
    const event = eventRecord({
      endAt: new Date("2026-11-01T07:30:00.000Z"),
      startAt: new Date("2026-11-01T05:30:00.000Z"),
    });

    expect(
      selectClubReminderCandidates([event], { now: NOW })[0],
    ).toMatchObject({
      endDateTime: "2026-11-01T07:30:00.000Z",
      startDateTime: "2026-11-01T05:30:00.000Z",
    });
  });

  it("uses desired-and-synchronized visibility while an update is partial", () => {
    const internalToPublic = eventRecord({
      audience: "public",
      discord: { appliedRevision: 2, state: "synced" },
      internal: false,
      revision: 2,
      synchronizedVisibility: {
        audience: "public",
        internal: true,
        roleIds: [],
      },
    });
    const rolesToPublic = eventRecord({
      audience: "public",
      discord: { appliedRevision: 2, state: "synced" },
      id: "00000000-0000-4000-8000-000000000119",
      revision: 2,
      synchronizedVisibility: {
        audience: "roles",
        internal: false,
        roleIds: ["00000000-0000-4000-8000-000000000401"],
      },
    });

    expect(
      selectClubReminderCandidates([internalToPublic, rolesToPublic], {
        now: NOW,
      }),
    ).toEqual([]);
  });
});
