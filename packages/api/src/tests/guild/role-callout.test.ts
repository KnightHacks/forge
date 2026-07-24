import { describe, expect, it } from "vitest";

import { getGuildRoleCallout } from "../../utils/guild/role-callout";

describe("Guild role callouts", () => {
  it("prioritizes an officer over director and team roles", () => {
    expect(
      getGuildRoleCallout([
        { name: "Design Team", color: "#eaacff" },
        { name: "Design Director", color: "#eaacff" },
        { name: "President", color: "#ffb000" },
      ]),
    ).toEqual({
      category: "officer",
      color: "#ffb000",
      label: "President",
    });
  });

  it("uses configured order within the same tier", () => {
    expect(
      getGuildRoleCallout([
        { name: "Secretary", color: null },
        { name: "Vice President", color: "#ffb000" },
      ]),
    ).toEqual({
      category: "officer",
      color: "#ffb000",
      label: "Vice President",
    });
  });

  it("normalizes aggregate and team membership labels", () => {
    expect(
      getGuildRoleCallout([{ name: "Directors", color: "#123456" }]),
    ).toMatchObject({ category: "director", label: "Director" });
    expect(
      getGuildRoleCallout([{ name: "Dev Team", color: "#93ceff" }]),
    ).toMatchObject({ category: "team", label: "Development Team" });
    expect(
      getGuildRoleCallout([{ name: "KH IX Team", color: "#f4c542" }]),
    ).toMatchObject({ category: "team", label: "Organizer" });
  });

  it("omits unknown roles", () => {
    expect(
      getGuildRoleCallout([{ name: "Discord role nobody knows", color: null }]),
    ).toBeNull();
  });
});
