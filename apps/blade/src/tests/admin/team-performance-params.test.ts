import { describe, expect, it } from "vitest";

import {
  buildTeamPerformanceSearchParams,
  parseTeamPerformanceSearchParams,
} from "~/app/_components/admin/analytics/team-performance-params";

describe("team performance URL state", () => {
  it("parses team, period, and ranking selections", () => {
    const parsed = parseTeamPerformanceSearchParams(
      {
        period: "all-time",
        rank: "longest-streak",
        team: "development",
      },
      "design",
    );

    expect(parsed).toEqual({
      input: { period: { kind: "all_time" }, teamSlug: "development" },
      rankBy: "longest-streak",
    });
  });

  it("round-trips custom ranges and falls back from unknown ranking fields", () => {
    const parsed = parseTeamPerformanceSearchParams(
      { rank: "made-up" },
      "development",
    );
    expect(parsed.rankBy).toBe("issues");

    const params = buildTeamPerformanceSearchParams(
      {
        period: {
          from: new Date("2026-08-01T00:00:00.000Z"),
          kind: "custom",
          to: new Date("2026-08-08T00:00:00.000Z"),
        },
        teamSlug: "development",
      },
      "events",
    );
    expect(params.get("scope")).toBe("team");
    expect(params.get("team")).toBe("development");
    expect(params.get("rank")).toBe("events");
    expect(params.get("from")).toBe("2026-08-01");
    expect(params.get("to")).toBe("2026-08-08");
  });
});
