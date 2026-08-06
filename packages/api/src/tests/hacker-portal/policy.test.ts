import { describe, expect, it } from "vitest";

import { deriveDiscordProfileIdentity } from "../../hacker-portal/profile";
import {
  deriveAgeOnDate,
  getParticipantCapabilities,
  rankLeaderboardRows,
  toLeaderboardName,
} from "../../utils/hacker-portal/policy";

describe("hacker portal participant policy", () => {
  it("derives age on exact birthdays without reading a stored age", () => {
    expect(
      deriveAgeOnDate("2008-08-06", new Date("2026-08-05T16:00:00Z")),
    ).toBe(17);
    expect(
      deriveAgeOnDate("2008-08-06", new Date("2026-08-06T16:00:00Z")),
    ).toBe(18);
    expect(
      deriveAgeOnDate("2008-02-29", new Date("2026-02-28T17:00:00Z")),
    ).toBe(17);
    expect(
      deriveAgeOnDate("2008-02-29", new Date("2026-03-01T17:00:00Z")),
    ).toBe(18);
  });

  it("exposes lifecycle capabilities from status and server dates", () => {
    const beforeStart = new Date("2026-08-05T15:59:00Z");
    const start = new Date("2026-08-05T16:00:00Z");
    const deadline = new Date("2026-07-15T16:00:00Z");

    expect(
      getParticipantCapabilities({
        confirmationDeadline: new Date("2026-08-04T16:00:00Z"),
        now: beforeStart,
        start,
        status: "pending",
      }),
    ).toMatchObject({
      canConfirm: false,
      canEdit: true,
      canViewLeaderboard: false,
      canViewSchedule: false,
      canWithdraw: true,
    });
    expect(
      getParticipantCapabilities({
        confirmationDeadline: deadline,
        now: beforeStart,
        start,
        status: "confirmed",
      }),
    ).toMatchObject({
      canEdit: true,
      canGetPass: true,
      canViewLeaderboard: true,
      canViewSchedule: false,
      canWithdraw: true,
    });
    expect(
      getParticipantCapabilities({
        confirmationDeadline: deadline,
        now: start,
        start,
        status: "confirmed",
      }),
    ).toMatchObject({ canEdit: false, canWithdraw: false });
    expect(
      getParticipantCapabilities({
        confirmationDeadline: deadline,
        now: beforeStart,
        start,
        status: "checkedin",
      }),
    ).toMatchObject({
      canEdit: true,
      canGetPass: true,
      canViewLeaderboard: true,
      canViewSchedule: true,
      canWithdraw: false,
    });
  });

  it("uses competition ranking with deterministic tie ordering", () => {
    const ranked = rankLeaderboardRows([
      { id: "c", lastName: "Zulu", points: 75 },
      { id: "b", lastName: "Beta", points: 100 },
      { id: "a", lastName: "Alpha", points: 100 },
    ]);

    expect(
      ranked.map(({ id, points, rank }) => ({ id, points, rank })),
    ).toEqual([
      { id: "a", points: 100, rank: 1 },
      { id: "b", points: 100, rank: 1 },
      { id: "c", points: 75, rank: 3 },
    ]);
  });

  it("minimizes leaderboard identity", () => {
    expect(toLeaderboardName("Dylan", "Vidal")).toBe("Dylan V.");
    expect(toLeaderboardName("Prince", "")).toBe("Prince");
  });

  it("derives Discord profile identity from auth instead of participant input", () => {
    expect(
      deriveDiscordProfileIdentity({
        discordUserId: "123456789012345678",
        name: " dvidal1205 ",
      }),
    ).toBe("dvidal1205");
    expect(
      deriveDiscordProfileIdentity({
        discordUserId: "123456789012345678",
        name: null,
      }),
    ).toBe("123456789012345678");
  });
});
