import { describe, expect, it } from "vitest";

import { hackerSdkQueryKeys } from "../query-keys";

describe("Hacker SDK query keys", () => {
  it("TC-SDK-002 scopes related participant data under one stable prefix", () => {
    const participant = hackerSdkQueryKeys.participant("kh-x");

    expect(
      hackerSdkQueryKeys.application("kh-x").slice(0, participant.length),
    ).toEqual(participant);
    expect(
      hackerSdkQueryKeys.points("kh-x").slice(0, participant.length),
    ).toEqual(participant);
    expect(hackerSdkQueryKeys.publicHackathon("kh-x")).not.toEqual([
      ...participant,
    ]);
    expect(hackerSdkQueryKeys.participant("bloom")).not.toEqual(participant);
  });
});
