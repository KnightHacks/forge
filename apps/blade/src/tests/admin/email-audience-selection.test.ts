import { describe, expect, it } from "vitest";

import {
  audienceDefinitions,
  defaultAudienceKey,
  restoreDraftAudiences,
  toggleAudienceSelection,
} from "~/app/_components/admin/email/email-audience-selection";

describe("defaultAudienceKey", () => {
  it("seeds a normal campaign with current members", () => {
    expect(defaultAudienceKey(false)).toBe("current_members");
  });

  it("seeds a development review campaign with the team roster", () => {
    expect(defaultAudienceKey(true)).toBe("team_members");
  });
});

describe("restoreDraftAudiences", () => {
  it("restores a normal campaign's draft untouched", () => {
    const draft = ["current_members", "alumni", "hack:h1:registered"];
    expect(restoreDraftAudiences(draft, false)).toEqual(draft);
  });

  it("drops everything but the team preset and roles in review mode", () => {
    expect(
      restoreDraftAudiences(
        ["current_members", "alumni", "team_members", "role:r1", "hack:h1:all"],
        true,
      ),
    ).toEqual(["team_members", "role:r1"]);
  });

  it("falls back to the default when review mode filters everything out", () => {
    expect(restoreDraftAudiences(["current_members", "alumni"], true)).toEqual([
      "team_members",
    ]);
  });

  it("falls back to the default for an empty draft", () => {
    expect(restoreDraftAudiences([], false)).toEqual(["current_members"]);
    expect(restoreDraftAudiences([], true)).toEqual(["team_members"]);
  });
});

describe("toggleAudienceSelection", () => {
  it("adds a key that is not selected and removes one that is", () => {
    expect([...toggleAudienceSelection(new Set(), "alumni")]).toEqual([
      "alumni",
    ]);
    expect([...toggleAudienceSelection(new Set(["alumni"]), "alumni")]).toEqual(
      [],
    );
  });

  it("collapses a hackathon's per-status keys when 'all' is selected", () => {
    const next = toggleAudienceSelection(
      new Set(["hack:h1:registered", "hack:h1:waitlisted", "alumni"]),
      "hack:h1:all",
    );
    expect([...next]).toEqual(["alumni", "hack:h1:all"]);
  });

  it("only collapses the hackathon being toggled", () => {
    const next = toggleAudienceSelection(
      new Set(["hack:h1:registered", "hack:h10:registered"]),
      "hack:h1:all",
    );
    expect([...next]).toEqual(["hack:h10:registered", "hack:h1:all"]);
  });

  it("clears the 'all' key when a single status is selected", () => {
    const next = toggleAudienceSelection(
      new Set(["hack:h1:all"]),
      "hack:h1:registered",
    );
    expect([...next]).toEqual(["hack:h1:registered"]);
  });

  it("leaves other hackathons' 'all' keys alone", () => {
    const next = toggleAudienceSelection(
      new Set(["hack:h2:all"]),
      "hack:h1:registered",
    );
    expect([...next]).toEqual(["hack:h2:all", "hack:h1:registered"]);
  });

  it("never mutates the set it was given", () => {
    const current = new Set(["hack:h1:registered"]);
    toggleAudienceSelection(current, "hack:h1:all");
    expect([...current]).toEqual(["hack:h1:registered"]);
  });
});

describe("audienceDefinitions", () => {
  it("maps each preset key to its definition", () => {
    expect(
      audienceDefinitions(
        new Set(["current_members", "alumni", "team_members"]),
      ),
    ).toEqual([
      { kind: "current_members" },
      { kind: "alumni" },
      { kind: "team_members" },
    ]);
  });

  it("maps a role key to a role definition", () => {
    expect(audienceDefinitions(new Set(["role:role-1"]))).toEqual([
      { kind: "role", roleId: "role-1" },
    ]);
  });

  it("ignores a role key with no id", () => {
    expect(audienceDefinitions(new Set(["role:"]))).toEqual([]);
  });

  it("ignores keys with no hackathon id", () => {
    expect(audienceDefinitions(new Set(["hack:", "nonsense"]))).toEqual([]);
  });

  it("collects several statuses of one hackathon into one definition", () => {
    expect(
      audienceDefinitions(
        new Set(["hack:h1:registered", "hack:h1:checked_in"]),
      ),
    ).toEqual([
      {
        hackathonId: "h1",
        kind: "hackathon",
        statuses: ["registered", "checked_in"],
      },
    ]);
  });

  it("keeps separate hackathons separate", () => {
    expect(
      audienceDefinitions(new Set(["hack:h1:registered", "hack:h2:all"])),
    ).toEqual([
      { hackathonId: "h1", kind: "hackathon", statuses: ["registered"] },
      { hackathonId: "h2", kind: "hackathon" },
    ]);
  });

  it("widens an existing status list to the whole hackathon on 'all'", () => {
    expect(
      audienceDefinitions(new Set(["hack:h1:registered", "hack:h1:all"])),
    ).toEqual([{ hackathonId: "h1", kind: "hackathon", statuses: undefined }]);
  });

  it("keeps the hackathon whole when 'all' was selected first", () => {
    // Characterizes today's behavior: once a hackathon is selected whole, a
    // later per-status key cannot narrow it back down.
    expect(
      audienceDefinitions(new Set(["hack:h1:all", "hack:h1:registered"])),
    ).toEqual([{ hackathonId: "h1", kind: "hackathon" }]);
  });

  it("returns nothing for an empty selection", () => {
    expect(audienceDefinitions(new Set())).toEqual([]);
  });
});
