import { describe, expect, it } from "vitest";

import { getHackerMapAccess } from "../lifecycle";

const event = {
  startsAt: "2026-10-09T16:00:00Z",
  timeZone: "America/New_York",
};

describe("participant map access", () => {
  it.each(["confirmed", "checkedin"] as const)(
    "unlocks %s at Friday midnight in Orlando and stays open afterward",
    (status) => {
      expect(
        getHackerMapAccess({
          ...event,
          status,
          now: new Date("2026-10-09T03:59:59.999Z"),
        }),
      ).toBe("locked-date");
      expect(
        getHackerMapAccess({
          ...event,
          status,
          now: new Date("2026-10-09T04:00:00Z"),
        }),
      ).toBe("available");
      expect(
        getHackerMapAccess({
          ...event,
          status,
          now: new Date("2026-10-10T04:00:00Z"),
        }),
      ).toBe("available");
    },
  );

  it.each([
    null,
    "pending",
    "accepted",
    "waitlisted",
    "denied",
    "withdrawn",
  ] as const)("keeps %s locked after opening", (status) => {
    expect(
      getHackerMapAccess({
        ...event,
        status,
        now: new Date("2026-10-10T12:00:00Z"),
      }),
    ).toBe("locked-status");
  });

  it("uses the event timezone instead of the viewer timezone or a fixed UTC offset", () => {
    const winterEvent = {
      startsAt: "2026-12-04T17:00:00Z",
      timeZone: "America/New_York",
      status: "confirmed" as const,
    };
    expect(
      getHackerMapAccess({
        ...winterEvent,
        now: new Date("2026-12-04T04:59:59Z"),
      }),
    ).toBe("locked-date");
    expect(
      getHackerMapAccess({
        ...winterEvent,
        now: new Date("2026-12-04T05:00:00Z"),
      }),
    ).toBe("available");
  });

  it.each([
    { ...event, startsAt: "invalid" },
    { ...event, timeZone: "invalid" },
  ])("fails closed with invalid timing: %j", (timing) => {
    expect(getHackerMapAccess({ ...timing, status: "confirmed" })).toBe(
      "locked-date",
    );
  });
});
