import { describe, expect, it } from "vitest";

import {
  buildIssueSearchParams,
  parseIssueSearchParams,
} from "~/app/_components/admin/issues/params";

describe("Issues URL state", () => {
  it("TC-UI-002 keeps filters stable while views change", () => {
    const input = parseIssueSearchParams({
      priority: ["High", "Highest"],
      q: "  kickoff  ",
      status: "Planning",
      team: "00000000-0000-4000-8000-000000000001",
    });
    expect(input).toMatchObject({
      priorities: ["High", "Highest"],
      search: "kickoff",
      statuses: ["Planning"],
      teamIds: ["00000000-0000-4000-8000-000000000001"],
    });
    expect(buildIssueSearchParams(input).toString()).toContain("q=kickoff");
    expect(buildIssueSearchParams(input).getAll("priority")).toEqual([
      "High",
      "Highest",
    ]);
  });

  it("TC-UI-002 drops malformed public URL state", () => {
    expect(
      parseIssueSearchParams({
        page: "-4",
        priority: "Urgent",
        status: "Deleted",
        team: "not-a-team",
      }),
    ).toMatchObject({ page: 1, priorities: [], statuses: [], teamIds: [] });
  });
});
