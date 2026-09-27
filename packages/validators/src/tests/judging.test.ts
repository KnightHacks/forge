import { describe, expect, it } from "vitest";

import {
  guestJudgeNameSchema,
  judgingAnnouncementPublishSchema,
  judgingCommsChannelSchema,
  judgingEvaluationSaveSchema,
  judgingReorderSchema,
  judgingRoomCreateSchema,
  judgingRoomMoveSchema,
  judgingRubricSaveSchema,
} from "../judging";

const hackathonId = "00000000-0000-4000-8000-000000000001";
const challengeId = "00000000-0000-4000-8000-000000000002";
const itemId = "00000000-0000-4000-8000-000000000003";
const responseId = "00000000-0000-4000-8000-000000000004";
const projectId = "00000000-0000-4000-8000-000000000005";

describe("judging inputs", () => {
  it("accepts an optional judging communications channel", () => {
    expect(
      judgingCommsChannelSchema.safeParse({
        channelId: null,
        hackathonId,
      }).success,
    ).toBe(true);
    expect(
      judgingCommsChannelSchema.safeParse({
        channelId: "1306042070686896230",
        hackathonId,
      }).success,
    ).toBe(true);
    expect(
      judgingCommsChannelSchema.safeParse({
        channelId: "not-a-channel",
        hackathonId,
      }).success,
    ).toBe(false);
  });

  it("validates judging announcements and defaults their audience", () => {
    expect(
      judgingAnnouncementPublishSchema.parse({
        hackathonId,
        message: "  Pitches pause at 4:30 PM.  ",
        roomId: null,
      }),
    ).toMatchObject({
      includeGuests: false,
      isUrgent: false,
      message: "Pitches pause at 4:30 PM.",
      roomId: null,
    });
    for (const message of [
      "   ",
      "\t",
      "\n",
      "x".repeat(1001),
      "Unsafe\u0007copy",
    ]) {
      expect(
        judgingAnnouncementPublishSchema.safeParse({
          hackathonId,
          message,
          roomId: null,
        }).success,
      ).toBe(false);
    }
  });

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

  it("accepts a data-driven rubric and trims its copy", () => {
    const result = judgingRubricSaveSchema.parse({
      hackathonId,
      items: [
        {
          guestVisibilityPolicy: null,
          kind: "rating",
          label: "  Technical understanding  ",
          memberVisibilityPolicy: null,
          required: true,
        },
        {
          guestVisibilityPolicy: "public_optional",
          kind: "short_response",
          label: "  Feedback  ",
          memberVisibilityPolicy: "public",
          required: false,
        },
      ],
    });

    expect(result.items.map((item) => item.label)).toEqual([
      "Technical understanding",
      "Feedback",
    ]);
  });

  it("rejects mismatched rubric visibility policies and duplicate IDs", () => {
    expect(
      judgingRubricSaveSchema.safeParse({
        hackathonId,
        items: [
          {
            guestVisibilityPolicy: null,
            kind: "rating",
            label: "Optional score",
            memberVisibilityPolicy: null,
            required: false,
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      judgingRubricSaveSchema.safeParse({
        hackathonId,
        items: [
          {
            guestVisibilityPolicy: "private",
            id: itemId,
            kind: "rating",
            label: "Wow factor",
            memberVisibilityPolicy: null,
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      judgingRubricSaveSchema.safeParse({
        hackathonId,
        items: [
          {
            guestVisibilityPolicy: null,
            id: itemId,
            kind: "rating",
            label: "Wow factor",
            memberVisibilityPolicy: null,
          },
          {
            guestVisibilityPolicy: null,
            id: itemId,
            kind: "rating",
            label: "Originality",
            memberVisibilityPolicy: null,
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("accepts only integer ratings from one through five", () => {
    const base = {
      projectId,
      ratings: [{ itemId, value: 3 }],
      responses: [{ itemId: responseId, value: "Useful feedback" }],
    };

    expect(judgingEvaluationSaveSchema.safeParse(base).success).toBe(true);
    for (const value of [0, 1.5, 6]) {
      expect(
        judgingEvaluationSaveSchema.safeParse({
          ...base,
          ratings: [{ itemId, value }],
        }).success,
      ).toBe(false);
    }
  });

  it("rejects duplicate answer item IDs", () => {
    const base = {
      projectId,
      ratings: [{ itemId, value: 3 }],
      responses: [{ itemId: responseId, value: "Useful feedback" }],
    };

    expect(
      judgingEvaluationSaveSchema.safeParse({
        ...base,
        ratings: [...base.ratings, ...base.ratings],
      }).success,
    ).toBe(false);
    expect(
      judgingEvaluationSaveSchema.safeParse({
        ...base,
        responses: [...base.responses, ...base.responses],
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate reorder IDs", () => {
    expect(
      judgingReorderSchema.safeParse({ ids: [itemId, itemId] }).success,
    ).toBe(false);
    expect(
      judgingReorderSchema.safeParse({ ids: [itemId, responseId] }).success,
    ).toBe(true);
  });
});
