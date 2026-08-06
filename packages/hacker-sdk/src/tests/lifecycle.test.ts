import { describe, expect, it } from "vitest";

import {
  getHackerCapabilityHints,
  getHackerLifecycleState,
  isWithdrawalAcknowledged,
  WITHDRAWAL_ACKNOWLEDGEMENT,
} from "../lifecycle";

const dates = {
  applicationClosesAt: "2026-07-01T00:00:00.000Z",
  applicationOpensAt: "2026-05-01T00:00:00.000Z",
  confirmationClosesAt: "2026-07-15T00:00:00.000Z",
  startsAt: "2026-08-01T00:00:00.000Z",
} as const;

describe("Hacker SDK lifecycle helpers", () => {
  it("describes the application window and accepted capacity states", () => {
    expect(
      getHackerLifecycleState({
        ...dates,
        now: new Date("2026-04-01T00:00:00.000Z"),
        status: null,
      }),
    ).toBe("application-before-open");
    expect(
      getHackerLifecycleState({
        ...dates,
        now: new Date("2026-06-01T00:00:00.000Z"),
        status: null,
      }),
    ).toBe("application-open");
    expect(
      getHackerLifecycleState({
        ...dates,
        confirmationCapacity: 10,
        confirmedCount: 10,
        now: new Date("2026-07-10T00:00:00.000Z"),
        status: "accepted",
      }),
    ).toBe("accepted-at-capacity");
    expect(
      getHackerLifecycleState({
        ...dates,
        now: new Date("2026-08-01T00:00:00.000Z"),
        status: "accepted",
      }),
    ).toBe("accepted-confirmation-closed");
  });

  it("keeps schedule checked-in-only while leaderboard and QR include confirmed", () => {
    expect(
      getHackerCapabilityHints({
        confirmationClosesAt: dates.confirmationClosesAt,
        now: new Date("2026-07-10T00:00:00.000Z"),
        startsAt: dates.startsAt,
        status: "confirmed",
      }),
    ).toMatchObject({
      canGetCheckInPass: true,
      canViewLeaderboard: true,
      canViewSchedule: false,
      canWithdraw: true,
    });
    expect(
      getHackerCapabilityHints({
        confirmationClosesAt: dates.confirmationClosesAt,
        now: new Date("2026-07-10T00:00:00.000Z"),
        startsAt: dates.startsAt,
        status: "checkedin",
      }),
    ).toMatchObject({
      canEditApplication: true,
      canEditProfile: true,
      canViewLeaderboard: true,
      canViewSchedule: true,
      canWithdraw: false,
    });
  });

  it("TC-SDK-006 recognizes only the irreversible acknowledgement literal", () => {
    expect(isWithdrawalAcknowledged("yes")).toBe(false);
    expect(isWithdrawalAcknowledged(WITHDRAWAL_ACKNOWLEDGEMENT)).toBe(true);
  });
});
