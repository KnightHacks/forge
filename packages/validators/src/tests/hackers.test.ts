import { describe, expect, it } from "vitest";

import {
  HACKER_STATUS_LABELS,
  hackerBulkPreviewSchema,
  hackerRosterListSchema,
  hackerSetBlacklistSchema,
  hackerSetStatusSchema,
} from "../hackers";

describe("TC-NEG-004: checked-in is unreachable from the roster", () => {
  // The whole point of reusing `hackathonSendingStatusSchema` rather than the
  // wider application-state list. Check-in belongs to the event slice and
  // reaches the column another way; an officer must not be able to fake it.
  it("rejects a transition to checkedin", () => {
    expect(
      hackerSetStatusSchema.safeParse({
        attendeeId: "00000000-0000-4000-8000-000000000001",
        status: "checkedin",
      }).success,
    ).toBe(false);
  });

  it.each([
    "accepted",
    "confirmed",
    "denied",
    "pending",
    "waitlisted",
    "withdrawn",
  ])("accepts %s", (status) => {
    expect(
      hackerSetStatusSchema.safeParse({
        attendeeId: "00000000-0000-4000-8000-000000000001",
        status,
      }).success,
    ).toBe(true);
  });

  it("still allows filtering by checkedin", () => {
    // Reading is not transitioning. An officer needs to see who checked in even
    // though they cannot set it here.
    expect(
      hackerRosterListSchema.safeParse({
        filter: { status: "checkedin" },
        hackathonId: "00000000-0000-4000-8000-000000000002",
      }).success,
    ).toBe(true);
  });
});

describe("TC-NEG-007: a blacklist needs a reason", () => {
  const attendeeId = "00000000-0000-4000-8000-000000000001";

  it("rejects setting the flag with no reason", () => {
    expect(
      hackerSetBlacklistSchema.safeParse({ attendeeId, blacklisted: true })
        .success,
    ).toBe(false);
  });

  it("rejects a whitespace-only reason", () => {
    expect(
      hackerSetBlacklistSchema.safeParse({
        attendeeId,
        blacklisted: true,
        reason: "   ",
      }).success,
    ).toBe(false);
  });

  it("accepts a reason", () => {
    expect(
      hackerSetBlacklistSchema.safeParse({
        attendeeId,
        blacklisted: true,
        reason: "Repeated code of conduct violations.",
      }).success,
    ).toBe(true);
  });

  it("needs no reason to clear the flag", () => {
    // Removing a blacklist is not the judgement; setting it is.
    expect(
      hackerSetBlacklistSchema.safeParse({ attendeeId, blacklisted: false })
        .success,
    ).toBe(true);
  });
});

describe("bulk bounds", () => {
  const base = {
    hackathonId: "00000000-0000-4000-8000-000000000002",
    status: "accepted" as const,
  };

  it("requires at least one applicant", () => {
    expect(
      hackerBulkPreviewSchema.safeParse({ ...base, attendeeIds: [] }).success,
    ).toBe(false);
  });

  it("caps the selection so a malformed client cannot mail an unbounded set", () => {
    const tooMany = Array.from(
      { length: 5001 },
      () => "00000000-0000-4000-8000-000000000001",
    );
    expect(
      hackerBulkPreviewSchema.safeParse({ ...base, attendeeIds: tooMany })
        .success,
    ).toBe(false);
  });
});

describe("roster limit", () => {
  const hackathonId = "00000000-0000-4000-8000-000000000002";

  it("defaults to a page rather than everything", () => {
    const parsed = hackerRosterListSchema.parse({ hackathonId });
    expect(parsed.limit).toBe(50);
  });

  it("allows show-all to cover a whole hackathon", () => {
    // 2537 attendees exist in the dev database; a ceiling below that would
    // make "show all" quietly mean "show some", which is the failure mode
    // bulk selection cannot tolerate.
    expect(
      hackerRosterListSchema.safeParse({ hackathonId, limit: 5000 }).success,
    ).toBe(true);
    expect(
      hackerRosterListSchema.safeParse({ hackathonId, limit: 5001 }).success,
    ).toBe(false);
  });
});

describe("officer-facing status labels", () => {
  it("presents denied as capacity", () => {
    // Officers reject for capacity; the stored value is `denied` and the
    // applicant receives the capacity template. A screen that says "denied"
    // would be describing something nobody chose.
    expect(HACKER_STATUS_LABELS.denied).toBe("Capacity");
    expect(HACKER_STATUS_LABELS.pending).toBe("Applied");
  });

  it("labels every status an officer can set", () => {
    // Missing a label renders a raw slug, so this pins the two lists together.
    const settable = [
      "accepted",
      "confirmed",
      "denied",
      "pending",
      "waitlisted",
      "withdrawn",
    ];
    expect(Object.keys(HACKER_STATUS_LABELS).sort()).toEqual(settable.sort());
  });
});
