import { NextResponse } from "next/server";

import { and, eq, ilike, or } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles, User } from "@forge/db/schemas/auth";
import { Member } from "@forge/db/schemas/knight-hacks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

const TEAM_DEFINITIONS = [
  {
    slug: "executive",
    label: "Executive",
    terms: ["executive", "officer", "officers", "super admin"],
  },
  {
    slug: "directors",
    label: "Directors",
    terms: ["director", "directors"],
  },
  {
    slug: "hackathon",
    label: "Hackathon",
    terms: ["hackathon", "hack org", "hackorg", "kh ix", "khix"],
  },
  {
    slug: "sponsorship",
    label: "Sponsorship",
    terms: ["sponsor", "sponsorship"],
  },
  {
    slug: "workshop",
    label: "Workshop",
    terms: ["workshop"],
  },
  {
    slug: "design",
    label: "Design",
    terms: ["design"],
  },
  {
    slug: "outreach",
    label: "Outreach",
    terms: ["outreach"],
  },
  {
    slug: "development",
    label: "Development",
    terms: ["development", "developer", "dev team"],
  },
] as const;

const EXECUTIVE_ROLE_OVERRIDES = new Map([
  ["Jason Sacerio", "Treasurer"],
  ["Kai Sprunger", "Hack Lead"],
  ["Dylan Vidal", "Dev Lead"],
]);

const EXECUTIVE_SORT_ORDER = new Map([
  ["Adrian Osorio Blanchard", 0],
  ["Carlos Catala", 1],
  ["Jason Sacerio", 2],
  ["Natalia Cano", 3],
  ["Kai Sprunger", 4],
  ["Dylan Vidal", 5],
]);

const DIRECTOR_ROLE_OVERRIDES = new Map([
  ["Chris Ho", "Outreach Director"],
  ["Michael Rusu", "Workshop Director"],
]);

type TeamSlug = (typeof TEAM_DEFINITIONS)[number]["slug"];
type TeamDefinition = (typeof TEAM_DEFINITIONS)[number];

interface PublicTeamMember {
  id: string;
  name: string;
  teamRole: string;
  imageUrl: string | null;
  linkedinUrl: string | null;
  color: string | null;
}

type PublicTeamRoster = Record<TeamSlug, PublicTeamMember[]>;

function createEmptyRoster(): PublicTeamRoster {
  return TEAM_DEFINITIONS.reduce((roster, team) => {
    roster[team.slug] = [];
    return roster;
  }, {} as PublicTeamRoster);
}

function getFullName(
  firstName: string | null,
  lastName: string | null,
  displayName: string | null,
) {
  const memberName = [firstName, lastName].filter(Boolean).join(" ").trim();

  if (memberName.length > 0) return memberName;
  if (displayName?.trim()) return displayName.trim();

  return "Knight Hacks Member";
}

function getGuildProfilePictureUrl(profilePictureUrl: string | null) {
  return profilePictureUrl?.trim() || null;
}

function getMatchingTeam(roleName: string): TeamDefinition | null {
  const normalizedRoleName = roleName.toLowerCase();

  return (
    TEAM_DEFINITIONS.find((team) =>
      team.terms.some((term) => normalizedRoleName.includes(term)),
    ) ?? null
  );
}

function getSpecificDirectorRole(roleNames: string[]) {
  return roleNames.find((roleName) => {
    const normalizedRoleName = roleName.toLowerCase();

    return (
      normalizedRoleName.includes("director") &&
      normalizedRoleName !== "directors"
    );
  });
}

function getExecutiveRoleLabel(tagline: string | null) {
  const normalizedTagline = tagline?.toLowerCase() ?? "";

  if (normalizedTagline.includes("president")) return "President";
  if (
    normalizedTagline.includes("vice president") ||
    /\bvp\b/.test(normalizedTagline)
  ) {
    return "Vice President";
  }
  if (normalizedTagline.includes("treasurer")) return "Treasurer";
  if (normalizedTagline.includes("secretary")) return "Secretary";

  return "Executive Officer";
}

function getTeamRoleLabel({
  name,
  roleNames,
  tagline,
  team,
}: {
  name: string;
  roleNames: string[];
  tagline: string | null;
  team: TeamDefinition;
}) {
  if (team.slug === "executive") {
    return EXECUTIVE_ROLE_OVERRIDES.get(name) ?? getExecutiveRoleLabel(tagline);
  }

  if (team.slug === "directors") {
    return (
      DIRECTOR_ROLE_OVERRIDES.get(name) ??
      getSpecificDirectorRole(roleNames) ??
      "Director"
    );
  }

  return team.label;
}

function sortRoster(roster: PublicTeamRoster) {
  for (const team of TEAM_DEFINITIONS) {
    roster[team.slug].sort((first, second) => {
      if (team.slug === "executive") {
        const firstOrder = EXECUTIVE_SORT_ORDER.get(first.name) ?? 999;
        const secondOrder = EXECUTIVE_SORT_ORDER.get(second.name) ?? 999;

        if (firstOrder !== secondOrder) return firstOrder - secondOrder;
      }

      return first.name.localeCompare(second.name);
    });
  }

  return roster;
}

async function getPublicClubRoster() {
  const filters = TEAM_DEFINITIONS.flatMap((team) =>
    team.terms.map((term) => ilike(Roles.name, `%${term}%`)),
  );
  const whereClause = or(...filters);

  const rows = await db
    .select({
      roleId: Roles.id,
      roleName: Roles.name,
      roleColor: Roles.teamHexcodeColor,
      userId: User.id,
      displayName: User.name,
      firstName: Member.firstName,
      lastName: Member.lastName,
      tagline: Member.tagline,
      guildProfilePictureUrl: Member.profilePictureUrl,
      linkedinProfileUrl: Member.linkedinProfileUrl,
    })
    .from(Roles)
    .innerJoin(Permissions, eq(Permissions.roleId, Roles.id))
    .innerJoin(User, eq(User.id, Permissions.userId))
    .innerJoin(Member, eq(Member.userId, User.id))
    .where(and(whereClause, eq(Member.guildProfileVisible, true)))
    .orderBy(Roles.name, Member.firstName, Member.lastName, User.name);

  const roster = createEmptyRoster();
  const rowsByUserId = new Map<string, typeof rows>();

  for (const row of rows) {
    rowsByUserId.set(row.userId, [
      ...(rowsByUserId.get(row.userId) ?? []),
      row,
    ]);
  }

  for (const userRows of rowsByUserId.values()) {
    const rankedRoles = userRows
      .map((row) => ({ row, team: getMatchingTeam(row.roleName) }))
      .filter(
        (
          entry,
        ): entry is { row: (typeof rows)[number]; team: TeamDefinition } =>
          entry.team !== null,
      )
      .sort(
        (first, second) =>
          TEAM_DEFINITIONS.findIndex((team) => team.slug === first.team.slug) -
          TEAM_DEFINITIONS.findIndex((team) => team.slug === second.team.slug),
      );
    const primaryRole = rankedRoles[0];

    if (!primaryRole) continue;

    const roleNames = userRows.map((row) => row.roleName);
    const { row, team } = primaryRole;
    const name = getFullName(row.firstName, row.lastName, row.displayName);

    roster[team.slug].push({
      id: `${row.roleId}-${row.userId}`,
      name,
      teamRole: getTeamRoleLabel({
        name,
        roleNames,
        tagline: row.tagline,
        team,
      }),
      imageUrl: getGuildProfilePictureUrl(row.guildProfilePictureUrl),
      linkedinUrl: row.linkedinProfileUrl?.trim() || null,
      color: row.roleColor,
    });
  }

  return sortRoster(roster);
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function GET() {
  try {
    const roster = await getPublicClubRoster();

    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        roster,
      },
      {
        headers: {
          ...CORS_HEADERS,
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        error: "Failed to load club team roster.",
        roster: createEmptyRoster(),
      },
      {
        status: 500,
        headers: CORS_HEADERS,
      },
    );
  }
}
