import { describe, expect, it } from "vitest";

import {
  guestJudgeNameSchema,
  judgingRoomCreateSchema,
  judgingRoomMoveSchema,
} from "../judging";

const hackathonId = "00000000-0000-4000-8000-000000000001";
const challengeId = "00000000-0000-4000-8000-000000000002";

describe("judging inputs", () => {
  it("trims room and guest judge names", () => {
    expect(
      judgingRoomCreateSchema.parse({
        challengeId,
        hackathonId,
        name: "  Sponsor suite  ",
      }).name,
    ).toBe("Sponsor suite");
    expect(guestJudgeNameSchema.parse({ displayName: "  Casey  " })).toEqual({
      displayName: "Casey",
    });
  });

  it("rejects blank and oversized visible names", () => {
    expect(() => guestJudgeNameSchema.parse({ displayName: "   " })).toThrow();
    expect(() => guestJudgeNameSchema.parse({ displayName: "A" })).toThrow();
    expect(() =>
      guestJudgeNameSchema.parse({ displayName: "x".repeat(101) }),
    ).toThrow();
    expect(() =>
      guestJudgeNameSchema.parse({ displayName: "Casey\u0007Sponsor" }),
    ).toThrow();
    expect(
      guestJudgeNameSchema.parse({ displayName: "李雷" }).displayName,
    ).toBe("李雷");
    expect(
      guestJudgeNameSchema.parse({ displayName: "x".repeat(100) }).displayName,
    ).toHaveLength(100);
    expect(() =>
      judgingRoomCreateSchema.parse({
        challengeId,
        hackathonId,
        name: "x".repeat(121),
      }),
    ).toThrow();
  });

  it("accepts only explicit room movement directions", () => {
    expect(
      judgingRoomMoveSchema.parse({
        direction: "up",
        roomId: "00000000-0000-4000-8000-000000000003",
      }),
    ).toMatchObject({ direction: "up" });
    expect(
      judgingRoomMoveSchema.safeParse({
        direction: "sideways",
        roomId: "00000000-0000-4000-8000-000000000003",
      }).success,
    ).toBe(false);
  });
});
