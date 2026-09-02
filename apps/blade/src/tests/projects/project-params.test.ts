import { describe, expect, it } from "vitest";

import {
  parseProjectDirectoryParams,
  parseUuidParam,
} from "~/app/_components/projects/params";

describe("project directory parameters", () => {
  it("ignores participant bounds outside the supported range", () => {
    expect(
      parseProjectDirectoryParams({
        maxParticipants: "101",
        minParticipants: "0",
      }),
    ).toMatchObject({
      maxParticipants: undefined,
      minParticipants: undefined,
    });
  });

  it("drops an inverted maximum while retaining the valid minimum", () => {
    expect(
      parseProjectDirectoryParams({
        maxParticipants: "2",
        minParticipants: "5",
      }),
    ).toMatchObject({
      maxParticipants: undefined,
      minParticipants: 5,
    });
  });

  it("drops malformed challenge and hackathon identifiers", () => {
    expect(
      parseProjectDirectoryParams({
        challenge: "not-a-uuid,00000000-0000-4000-8000-000000000527",
      }).challengeIds,
    ).toEqual(["00000000-0000-4000-8000-000000000527"]);
    expect(parseUuidParam("not-a-uuid")).toBeUndefined();
    expect(parseUuidParam("00000000-0000-4000-8000-000000000527")).toBe(
      "00000000-0000-4000-8000-000000000527",
    );
  });
});
