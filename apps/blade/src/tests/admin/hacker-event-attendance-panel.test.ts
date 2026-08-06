import { describe, expect, it } from "vitest";

import { adaptHackerEventAttendance } from "~/app/_components/admin/hackathon/hackers/hacker-event-attendance-panel";

describe("hackathon-scoped hacker attendance", () => {
  it("preserves a zero-point repeat as its own ordinary-event occurrence", () => {
    expect(
      adaptHackerEventAttendance({
        attendanceId: "attendance-repeat",
        checkedInAt: "2026-08-05T18:05:00.000Z",
        eventName: "Dinner",
        eventPurpose: "event",
        isInitialAttendance: false,
        operatorName: "Volunteer Two",
        pointsAwarded: 0,
      }),
    ).toEqual({
      attendanceId: "attendance-repeat",
      checkedInAt: "2026-08-05T18:05:00.000Z",
      eventName: "Dinner",
      eventPurpose: "event",
      isInitialAttendance: false,
      operatorName: "Volunteer Two",
      pointsAwarded: 0,
      voidedAt: null,
    });
  });

  it("adapts a nested primary event and operator", () => {
    expect(
      adaptHackerEventAttendance({
        id: "attendance-primary",
        event: { name: "Hackathon Check-in", purpose: "primary_check_in" },
        operator: { name: "Volunteer One" },
      }),
    ).toMatchObject({
      attendanceId: "attendance-primary",
      eventName: "Hackathon Check-in",
      eventPurpose: "primary_check_in",
      operatorName: "Volunteer One",
    });
  });
});
