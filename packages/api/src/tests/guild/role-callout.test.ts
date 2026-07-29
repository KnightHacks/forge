import { describe, expect, it } from "vitest";

import { getGuildRoleCallout } from "../../utils/guild/role-callout";
import {
  clubRoleId,
  createClubTeamConfigFixture,
} from "../support/club-team-config";

const config = createClubTeamConfigFixture();

function callout(...roleNames: [string, string | null][]) {
  return getGuildRoleCallout(
    config,
    roleNames.map(([name, color]) => ({ roleId: clubRoleId(name), color })),
  );
}

describe("Guild role callouts", () => {
  it("prioritizes an officer over director and team roles", () => {
    expect(
      callout(
        ["Design Team", "#eaacff"],
        ["Design Director", "#eaacff"],
        ["President", "#ffb000"],
      ),
    ).toEqual({
      category: "officer",
      color: "#ffb000",
      label: "President",
    });
  });

  it("uses configured order within the same tier", () => {
    expect(callout(["Secretary", null], ["Vice President", "#ffb000"])).toEqual(
      {
        category: "officer",
        color: "#ffb000",
        label: "Vice President",
      },
    );
  });

  it("orders team roles by their team's position, not by role rank", () => {
    // Every team role shares a rank, so the tie has to be broken by the team's
    // display order — Hackathon sits ahead of Design in the tab strip.
    expect(
      callout(["Design Team", "#eaacff"], ["KH IX Team", "#f4c542"]),
    ).toMatchObject({ label: "Organizer" });
    expect(
      callout(["KH IX Team", "#f4c542"], ["Design Team", "#eaacff"]),
    ).toMatchObject({ label: "Organizer" });
  });

  it("normalizes aggregate and team membership labels", () => {
    expect(callout(["Directors", "#123456"])).toMatchObject({
      category: "director",
      label: "Director",
    });
    expect(callout(["Officers", "#123456"])).toMatchObject({
      category: "officer",
      label: "Officer",
    });
    expect(callout(["Dev Team", "#93ceff"])).toMatchObject({
      category: "team",
      label: "Development Team",
    });
    expect(callout(["KH IX Team", "#f4c542"])).toMatchObject({
      category: "team",
      label: "Organizer",
    });
  });

  it("omits unclassified roles", () => {
    expect(
      getGuildRoleCallout(config, [
        { roleId: "role-nobody-classified", color: null },
      ]),
    ).toBeNull();
  });

  it("keeps labelling a renamed role, because classification is by ID", () => {
    // The regression this whole change exists to prevent: a Discord admin
    // renames "Dev Team", and the badge follows the new name instead of
    // vanishing.
    const renamed = createClubTeamConfigFixture({
      role: (role) =>
        role.roleName === "Dev Team"
          ? { ...role, roleName: "Software Team" }
          : role,
    });

    expect(
      getGuildRoleCallout(renamed, [
        { roleId: clubRoleId("Dev Team"), color: "#93ceff" },
      ]),
    ).toMatchObject({ category: "team", label: "Development Team" });
  });
});
