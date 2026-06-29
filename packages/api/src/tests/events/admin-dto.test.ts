import { describe, expect, it } from "vitest";

import { toAdminEventDto } from "../../utils/events/admin-dto";
import { eventRecord, USER_IDS } from "../support/events/fixtures";

describe("admin event response contract", () => {
  it("returns approved admin fields without workflow-only integration metadata", () => {
    const event = eventRecord({
      creationKey: "private-creation-key",
      deletionIntentAt: new Date("2026-07-01T17:00:00.000Z"),
      discord: {
        appliedDestination: "voice:private-channel",
        attemptToken: "discord-attempt-token",
      },
      google: {
        appliedDestination: "private-calendar-id",
        attemptToken: "google-attempt-token",
      },
    });
    const internal = {
      ...event,
      discordNoProjectionAcknowledgedAt: new Date("2026-07-01T18:00:00.000Z"),
      discordNoProjectionAcknowledgedBy: USER_IDS.operator,
    };

    const result = toAdminEventDto(internal);

    expect(result).toMatchObject({
      deletionPending: true,
      discord: { health: "synced", id: event.discord.id },
      google: { health: "synced", id: event.google.id },
      id: event.id,
      published: true,
      revision: event.revision,
    });
    expect(Object.keys(result).sort()).toEqual(
      [
        "attendanceCount",
        "audience",
        "deletionPending",
        "description",
        "discord",
        "discordChannel",
        "endAt",
        "google",
        "id",
        "internal",
        "legacy",
        "location",
        "name",
        "points",
        "published",
        "revision",
        "roleIds",
        "startAt",
        "tag",
        "tagColor",
      ].sort(),
    );
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("private-creation-key");
    expect(serialized).not.toContain("attempt-token");
    expect(serialized).not.toContain("private-calendar-id");
    expect(serialized).not.toContain(USER_IDS.operator);
  });

  it("does not report stale provider revisions as synchronized", () => {
    const result = toAdminEventDto(
      eventRecord({
        discord: { appliedRevision: 1, state: "synced" },
        google: { appliedRevision: 1, state: "synced" },
        revision: 2,
      }),
    );

    expect(result.discord.health).toBe("pending");
    expect(result.google.health).toBe("pending");
  });
});
