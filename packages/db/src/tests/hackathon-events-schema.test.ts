import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  Event,
  EventTag,
  Hackathon,
  HackathonEventReminderDelivery,
  HackerAttendee,
  HackerCheckInAttempt,
  HackerDiscordRoleGrant,
  HackerDiscordRoleGrantAttempt,
  HackerEventAttendee,
} from "../schemas/knight-hacks";

describe("hackathon event additive storage", () => {
  it("stores explicit event purpose and hackathon-scoped configuration", () => {
    expect(Object.keys(getTableColumns(Event))).toContain("purpose");
    expect(Object.keys(getTableColumns(EventTag))).toContain("hackathonId");
    expect(Object.keys(getTableColumns(Hackathon))).toEqual(
      expect.arrayContaining([
        "eventAnnouncementChannelId",
        "generalHackerDiscordRoleId",
      ]),
    );
  });

  it("keeps whole-hack state separate from repeatable event occurrences", () => {
    expect(Object.keys(getTableColumns(HackerAttendee))).toEqual(
      expect.arrayContaining(["checkedInAt", "checkedInBy", "isFirstTime"]),
    );
    expect(Object.keys(getTableColumns(HackerEventAttendee))).toEqual(
      expect.arrayContaining([
        "checkedInAt",
        "checkedInBy",
        "isInitialAttendance",
        "pointsAwarded",
        "voidedAt",
        "voidedBy",
        "voidReason",
      ]),
    );
  });

  it("stores repairable role delivery and deduplicated reminders", () => {
    expect(Object.keys(getTableColumns(HackerDiscordRoleGrant))).toEqual(
      expect.arrayContaining([
        "attemptCount",
        "desiredRoleId",
        "kind",
        "leaseExpiresAt",
        "leaseToken",
        "sourceEventId",
        "state",
      ]),
    );
    expect(Object.keys(getTableColumns(HackerDiscordRoleGrantAttempt))).toEqual(
      expect.arrayContaining([
        "attemptToken",
        "discordUserIdSnapshot",
        "outcome",
        "roleIdSnapshot",
      ]),
    );
    expect(
      Object.keys(getTableColumns(HackathonEventReminderDelivery)),
    ).toEqual(
      expect.arrayContaining([
        "eventId",
        "eventStartAt",
        "hackathonId",
        "reminderKey",
        "state",
      ]),
    );
  });

  it("does not retain raw scans or duplicate dates of birth in attempt history", () => {
    const columns = Object.keys(getTableColumns(HackerCheckInAttempt));

    expect(columns).toEqual(
      expect.arrayContaining([
        "attendanceId",
        "eventPurpose",
        "expiresAt",
        "isRepeatOccurrence",
        "outcome",
        "wasMinorAtAttempt",
      ]),
    );
    expect(columns).not.toContain("dob");
    expect(columns).not.toContain("qrPayload");
    expect(columns).not.toContain("rawPayload");
  });
});
