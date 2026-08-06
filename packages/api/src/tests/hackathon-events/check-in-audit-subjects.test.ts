import { describe, expect, it } from "vitest";

import { auditSubjectInputSchema } from "@forge/validators";

import { hackathonCheckInAuditSubjects } from "../../utils/hackathon-events/check-in";

const event = { id: "event-1", name: "Dinner" };
const hackathon = { id: "hack-1", name: "Knight Hacks IX" };

describe("hackathon check-in audit subjects", () => {
  it("makes the resolved attendee searchable and relates the attendance", () => {
    const subjects = hackathonCheckInAuditSubjects({
      attendanceId: "attendance-1",
      attemptId: "attempt-1",
      event,
      hacker: { attendeeId: "attendee-1", name: "Dylan Vidal" },
      hackathon,
    });

    expect(subjects).toEqual([
      {
        relation: "primary",
        targetId: "attendee-1",
        targetLabel: "Dylan Vidal",
        targetType: "hacker_attendee",
      },
      expect.objectContaining({ targetId: "event-1", targetType: "event" }),
      expect.objectContaining({
        targetId: "hack-1",
        targetType: "hackathon",
      }),
      expect.objectContaining({
        targetId: "attendance-1",
        targetLabel: "Dinner attendance for Dylan Vidal",
        targetType: "attendance",
      }),
      expect.objectContaining({
        targetId: "attempt-1",
        targetLabel: "Check-in attempt for Dylan Vidal",
        targetType: "check_in_attempt",
      }),
    ]);
    for (const subject of subjects) {
      expect(() => auditSubjectInputSchema.parse(subject)).not.toThrow();
    }
  });

  it("keeps unresolved scans centered on the event without inventing a person", () => {
    const subjects = hackathonCheckInAuditSubjects({
      attendanceId: null,
      attemptId: "attempt-2",
      event,
      hacker: null,
      hackathon,
    });

    expect(subjects[0]).toMatchObject({
      relation: "primary",
      targetId: "event-1",
      targetType: "event",
    });
    expect(subjects.some(({ targetType }) => targetType === "attendance")).toBe(
      false,
    );
    expect(
      subjects.some(({ targetType }) => targetType === "hacker_attendee"),
    ).toBe(false);
  });
});
