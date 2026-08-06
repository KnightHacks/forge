import { describe, expect, it } from "vitest";

import { maintainsClubEventDependents } from "../../utils/events/database-state";

describe("hackathon provider workflow scope", () => {
  it("does not provision Club feedback or mutate Club issues for hack events", () => {
    expect(
      maintainsClubEventDependents("10000000-0000-4000-8000-000000000001"),
    ).toBe(false);
  });

  it("preserves existing Club dependent behavior", () => {
    expect(maintainsClubEventDependents(null)).toBe(true);
  });
});
