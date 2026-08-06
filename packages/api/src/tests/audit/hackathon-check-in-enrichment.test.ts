import { describe, expect, it } from "vitest";

import { enrichLegacyCheckInSubjects } from "../../utils/audit/queries";

describe("legacy hackathon check-in audit enrichment", () => {
  it("projects immutable attempt context into actionable person-first detail", () => {
    const eventId = "00000000-0000-4000-8000-000000000001";
    const subjects = enrichLegacyCheckInSubjects(
      eventId,
      [
        {
          eventId,
          id: "00000000-0000-4000-8000-000000000002",
          memberId: null,
          metadata: {},
          position: 0,
          relation: "primary",
          resultOutcome: null,
          targetId: "00000000-0000-4000-8000-000000000003",
          targetLabel: "Dinner",
          targetType: "event",
        },
        {
          eventId,
          id: "00000000-0000-4000-8000-000000000004",
          memberId: null,
          metadata: {},
          position: 1,
          relation: "secondary",
          resultOutcome: null,
          targetId: "00000000-0000-4000-8000-000000000005",
          targetLabel: "Check-in attempt",
          targetType: "check_in_attempt",
        },
      ],
      {
        attendanceId: "00000000-0000-4000-8000-000000000006",
        attendeeId: "00000000-0000-4000-8000-000000000007",
        hackerName: "Dylan Vidal",
        hackathonId: "00000000-0000-4000-8000-000000000008",
        hackathonName: "Knight Hacks IX",
        id: "00000000-0000-4000-8000-000000000005",
      },
    );

    expect(subjects[0]).toMatchObject({
      relation: "primary",
      targetLabel: "Dylan Vidal",
      targetType: "hacker_attendee",
    });
    expect(subjects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          relation: "secondary",
          targetLabel: "Dinner",
          targetType: "event",
        }),
        expect.objectContaining({
          targetLabel: "Knight Hacks IX",
          targetType: "hackathon",
        }),
        expect.objectContaining({
          targetLabel: "Attendance for Dylan Vidal",
          targetType: "attendance",
        }),
      ]),
    );
  });
});
