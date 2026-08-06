import { describe, expect, it } from "vitest";

import {
  firstTimeStatusLabel,
  resolveFirstTimeStatus,
} from "~/app/_components/admin/hackathon/hackers/first-time-status";

describe("first-time hacker compatibility", () => {
  it("prefers the per-hackathon status over the profile fallback", () => {
    expect(
      resolveFirstTimeStatus({
        firstTimeStatus: "returning",
        isFirstTime: true,
      }),
    ).toBe("returning");
  });

  it("keeps unanswered history distinct from returning", () => {
    expect(resolveFirstTimeStatus({ isFirstTime: null })).toBe("unknown");
    expect(firstTimeStatusLabel("unknown")).toBe("Not recorded");
    expect(resolveFirstTimeStatus({ isFirstTime: false })).toBe("returning");
  });
});
