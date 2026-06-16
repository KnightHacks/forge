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
    terms: ["executive", "officer", "officers"],
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

const EXECUTIVE_ROLE_ORDER = [
  "President",
  "Vice President",
  "Treasurer",
  "Secretary",
  "Hack Lead",
  "Development Lead",
  "Executive Officer",
] as const;

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

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function getExecutiveRoleLabel({
  roleNames,
  tagline,
}: {
  roleNames: string[];
  tagline: string | null;
}) {
  const sources = [tagline ?? "", ...roleNames].map((value) =>
    value.toLowerCase(),
  );

  if (
    sources.some(
      (value) => value.includes("vice president") || /\bvp\b/.test(value),
    )
  ) {
    return "Vice President";
  }
  if (sources.some((value) => value.includes("president"))) {
    return "President";
  }
  if (sources.some((value) => value.includes("treasurer"))) {
    return "Treasurer";
  }
  if (sources.some((value) => value.includes("secretary"))) {
    return "Secretary";
  }
  if (
    sources.some((value) => includesAny(value, ["hack lead", "hackathon lead"]))
  ) {
    return "Hack Lead";
  }
  if (
    sources.some((value) =>
      includesAny(value, ["dev lead", "development lead"]),
    )
  ) {
    return "Development Lead";
  }

  return "Executive Officer";
}

function getExecutiveSortOrder(roleLabel: string) {
  const index = EXECUTIVE_ROLE_ORDER.findIndex((label) => label === roleLabel);

  return index === -1 ? EXECUTIVE_ROLE_ORDER.length : index;
}

function getTeamRoleLabel({
  roleNames,
  tagline,
  team,
}: {
  roleNames: string[];
  tagline: string | null;
  team: TeamDefinition;
}) {
  if (team.slug === "executive") {
    return getExecutiveRoleLabel({ roleNames, tagline });
  }

  if (team.slug === "directors") {
    return getSpecificDirectorRole(roleNames) ?? "Director";
  }

  return team.label;
}

function sortRoster(roster: PublicTeamRoster) {
  for (const team of TEAM_DEFINITIONS) {
    roster[team.slug].sort((first, second) => {
      if (team.slug === "executive") {
        const firstOrder = getExecutiveSortOrder(first.teamRole);
        const secondOrder = getExecutiveSortOrder(second.teamRole);

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
