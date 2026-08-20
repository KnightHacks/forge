import { describe, expect, it } from "vitest";

import type { RosterRoleRow } from "../../utils/guild/club-roster";
import { buildPublicClubRoster } from "../../utils/guild/club-roster";
import {
  clubRoleId,
  createClubTeamConfigFixture,
} from "../support/club-team-config";

const config = createClubTeamConfigFixture();

let nextMemberId = 0;

function rowsFor(name: string, ...roleNames: string[]): RosterRoleRow[] {
  const memberId = `member-${(nextMemberId += 1)}`;
  const [firstName, lastName = ""] = name.split(" ");

  return roleNames.map((roleName) => ({
    roleId: clubRoleId(roleName),
    roleColor: "#123456",
    userId: `user-${memberId}`,
    displayName: name,
    memberId,
    firstName: firstName ?? name,
    lastName,
    profilePictureReference: null,
    linkedinProfileUrl: null,
  }));
}

function labelsIn(
  roster: ReturnType<typeof buildPublicClubRoster>,
  slug: string,
) {
  return (roster.members[slug] ?? []).map(
    (member) => `${member.name} / ${member.teamRole}`,
  );
}

describe("public club roster bucketing", () => {
  it("returns a canonical public URL for a stored picture object key", () => {
    const [row] = rowsFor("Estefanie Parra", "KH IX Team");
    if (!row) throw new Error("Expected a roster fixture row");

    const profilePictureReference = `${row.userId}/profile-picture-4ac506f0-ab78-4722-88f6-2808763b65aa.jpg`;
    const roster = buildPublicClubRoster(config, [
      { ...row, profilePictureReference },
    ]);

    expect(roster.members.hackathon?.[0]?.imageUrl).toBe(
      `https://minio-y44gsgsskc4ko4kkwsg0csoc.135.237.97.107.sslip.io/` +
        `guild-profile-pictures/${profilePictureReference}`,
    );
  });

  it("returns every configured team, in tab order, even when empty", () => {
    const roster = buildPublicClubRoster(config, []);

    expect(roster.teams.map((team) => team.slug)).toEqual([
      "executive",
      "directors",
      "hackathon",
      "sponsorship",
      "workshop",
      "design",
      "outreach",
      "development",
    ]);
    expect(roster.teams[0]).toEqual({
      slug: "executive",
      label: "Executive",
      heading: "Executive Officers",
    });
    expect(Object.keys(roster.members)).toHaveLength(8);
    expect(roster.members.hackathon).toEqual([]);
  });

  it("orders officers by configured rank, not alphabetically", () => {
    const roster = buildPublicClubRoster(config, [
      ...rowsFor("Zoe Secretary", "Secretary"),
      ...rowsFor("Alice Treasurer", "Treasurer"),
      ...rowsFor("Bob President", "President"),
    ]);

    expect(labelsIn(roster, "executive")).toEqual([
      "Bob President / President",
      "Alice Treasurer / Treasurer",
      "Zoe Secretary / Secretary",
    ]);
  });

  it("places a lead in their own tier and at the head of the team they lead", () => {
    const roster = buildPublicClubRoster(config, [
      ...rowsFor("Aaron Member", "Design Team"),
      ...rowsFor("Zara Lead", "Design Director"),
    ]);

    expect(labelsIn(roster, "directors")).toEqual([
      "Zara Lead / Design Director",
    ]);
    expect(labelsIn(roster, "design")).toEqual([
      "Zara Lead / Design Director",
      "Aaron Member / Design",
    ]);
  });

  it("labels plain team members by their team, not by the Discord role name", () => {
    const roster = buildPublicClubRoster(
      config,
      rowsFor("Sam Organizer", "KH IX Team"),
    );

    expect(labelsIn(roster, "hackathon")).toEqual([
      "Sam Organizer / Hackathon",
    ]);
  });

  it("keeps Hack Lead in both the executive tier and the hackathon team", () => {
    const roster = buildPublicClubRoster(
      config,
      rowsFor("Kai Sprunger", "Hack Lead"),
    );

    expect(labelsIn(roster, "executive")).toEqual(["Kai Sprunger / Hack Lead"]);
    expect(labelsIn(roster, "hackathon")).toEqual(["Kai Sprunger / Hack Lead"]);
  });

  it("shows the aggregate Directors role as the singular Director, ranked last", () => {
    const roster = buildPublicClubRoster(config, [
      ...rowsFor("Ann Aggregate", "Directors"),
      ...rowsFor("Bea Specific", "Workshop Director"),
    ]);

    expect(labelsIn(roster, "directors")).toEqual([
      "Bea Specific / Workshop Director",
      "Ann Aggregate / Director",
    ]);
  });

  it("suppresses plain team membership for anyone holding a leadership role", () => {
    const roster = buildPublicClubRoster(
      config,
      rowsFor("Dylan Vidal", "Dev Lead", "Dev Team", "Design Team"),
    );

    expect(labelsIn(roster, "executive")).toEqual(["Dylan Vidal / Dev Lead"]);
    expect(labelsIn(roster, "development")).toEqual(["Dylan Vidal / Dev Lead"]);
    expect(labelsIn(roster, "design")).toEqual([]);
  });

  it("keeps a member in every team they belong to when they lead none", () => {
    const roster = buildPublicClubRoster(
      config,
      rowsFor("Jo Multi", "Design Team", "Outreach Team"),
    );

    expect(labelsIn(roster, "design")).toEqual(["Jo Multi / Design"]);
    expect(labelsIn(roster, "outreach")).toEqual(["Jo Multi / Outreach"]);
  });

  it("ignores roles the club roster does not classify", () => {
    const roster = buildPublicClubRoster(config, [
      ...rowsFor("Root Admin", "Superadmin"),
      ...rowsFor("Real Member", "Design Team"),
    ]);

    expect(labelsIn(roster, "design")).toEqual(["Real Member / Design"]);
    expect(
      Object.values(roster.members)
        .flat()
        .map((member) => member.name),
    ).toEqual(["Real Member"]);
  });

  it("follows a renamed role instead of dropping its team", () => {
    // Classification is keyed by role ID, so a Discord rename changes what the
    // card says and nothing else. Under the old name matching, this team went
    // empty on the public site with no error.
    const renamed = createClubTeamConfigFixture({
      role: (role) =>
        role.roleName === "Design Team"
          ? { ...role, roleName: "Brand Team" }
          : role,
    });

    const roster = buildPublicClubRoster(
      renamed,
      rowsFor("Still Here", "Design Team"),
    );

    expect(labelsIn(roster, "design")).toEqual(["Still Here / Design"]);
  });

  it("reflects a renamed team in its label, heading, and member cards", () => {
    const renamed = createClubTeamConfigFixture({
      team: (team) =>
        team.slug === "design"
          ? { ...team, label: "Brand", heading: "Brand Team" }
          : team,
    });

    const roster = buildPublicClubRoster(
      renamed,
      rowsFor("Rebranded Person", "Design Team"),
    );

    expect(roster.teams.find((team) => team.slug === "design")).toEqual({
      slug: "design",
      label: "Brand",
      heading: "Brand Team",
    });
    expect(labelsIn(roster, "design")).toEqual(["Rebranded Person / Brand"]);
  });

  it("sorts members of equal rank by name", () => {
    const roster = buildPublicClubRoster(config, [
      ...rowsFor("Charlie Zeta", "Workshop Team"),
      ...rowsFor("Alice Alpha", "Workshop Team"),
      ...rowsFor("Bob Beta", "Workshop Team"),
    ]);

    expect(labelsIn(roster, "workshop")).toEqual([
      "Alice Alpha / Workshop",
      "Bob Beta / Workshop",
      "Charlie Zeta / Workshop",
    ]);
  });

  it("prefixes member ids with the team so one person can appear twice", () => {
    const roster = buildPublicClubRoster(
      config,
      rowsFor("Kai Sprunger", "Hack Lead"),
    );

    expect(roster.members.executive?.[0]?.id).toMatch(/^executive-member-/);
    expect(roster.members.hackathon?.[0]?.id).toMatch(/^hackathon-member-/);
  });
});
