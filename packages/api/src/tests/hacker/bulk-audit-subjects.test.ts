import { describe, expect, it } from "vitest";

import { auditSubjectInputSchema } from "@forge/validators";

import { bulkAuditSubjects } from "../../routers/hacker";

/**
 * What a bulk status change records about who it touched.
 *
 * Counts describe the action; subjects describe who it happened to. An officer
 * asked in November why a particular applicant never heard back cannot answer it
 * from "movedCount: 187" — only a per-person subject makes the event findable by
 * the person.
 */
const hackathon = { displayName: "Knight Hacks IX", id: "hackathon-1" };

function moved(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    attendeeId: `attendee-${index}`,
    name: `Applicant ${index}`,
  }));
}

describe("bulkAuditSubjects", () => {
  it("keeps the hackathon primary and hangs every applicant off it", () => {
    const subjects = bulkAuditSubjects(hackathon, moved(3));

    expect(subjects.filter((s) => s.relation === "primary")).toEqual([
      expect.objectContaining({
        targetId: "hackathon-1",
        targetType: "hackathon",
      }),
    ]);
    expect(subjects.filter((s) => s.targetType === "hacker_attendee")).toEqual([
      expect.objectContaining({
        relation: "secondary",
        targetId: "attendee-0",
        targetLabel: "Applicant 0",
      }),
      expect.objectContaining({ targetId: "attendee-1" }),
      expect.objectContaining({ targetId: "attendee-2" }),
    ]);
  });

  it("names an ordinary capacity round in full", () => {
    // The largest hackathon so far is 1448 across every status, and a single
    // status bucket is far smaller — a real round must never be truncated.
    const subjects = bulkAuditSubjects(hackathon, moved(400));
    expect(
      subjects.filter((s) => s.targetType === "hacker_attendee"),
    ).toHaveLength(400);
  });

  it("bounds a runaway selection rather than writing an unbounded row", () => {
    const subjects = bulkAuditSubjects(hackathon, moved(5000));
    const named = subjects.filter((s) => s.targetType === "hacker_attendee");

    expect(named.length).toBeLessThan(5000);
    // The metadata's `subjectsTruncated` flag is what tells a reader the list is
    // partial; this only asserts the list itself stays bounded.
    expect(named.length).toBeGreaterThan(0);
  });

  it("produces subjects the audit schema accepts", () => {
    // The router hands these straight to `createAdminAuditEvent`, which parses
    // them — a shape it rejects would throw at the end of a transaction that has
    // already changed statuses and queued mail.
    for (const subject of bulkAuditSubjects(hackathon, moved(2))) {
      expect(() => auditSubjectInputSchema.parse(subject)).not.toThrow();
    }
  });

  it("records the hackathon even when nobody moved", () => {
    expect(bulkAuditSubjects(hackathon, [])).toHaveLength(1);
  });
});
