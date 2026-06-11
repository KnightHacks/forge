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
    terms: ["executive", "director", "officer", "officers", "super admin"],
  },
  {
    slug: "hackathon",
    label: "Hackathon",
    terms: ["hackathon", "hack org", "hackorg", "kh ix", "khix"],
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

type TeamSlug = (typeof TEAM_DEFINITIONS)[number]["slug"];

interface PublicTeamMember {
  id: string;
  name: string;
  teamRole: string;
  quote: string | null;
  imageUrl: string | null;
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

function getMatchingTeams(roleName: string) {
  const normalizedRoleName = roleName.toLowerCase();

  return TEAM_DEFINITIONS.filter((team) =>
    team.terms.some((term) => normalizedRoleName.includes(term)),
  );
}

function sortRoster(roster: PublicTeamRoster) {
  for (const team of TEAM_DEFINITIONS) {
    roster[team.slug].sort((first, second) =>
      first.name.localeCompare(second.name),
    );
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
    })
    .from(Roles)
    .innerJoin(Permissions, eq(Permissions.roleId, Roles.id))
    .innerJoin(User, eq(User.id, Permissions.userId))
    .innerJoin(Member, eq(Member.userId, User.id))
    .where(and(whereClause, eq(Member.guildProfileVisible, true)))
    .orderBy(Roles.name, Member.firstName, Member.lastName, User.name);

  const roster = createEmptyRoster();
  const seen = new Set<string>();

  for (const row of rows) {
    const matchingTeams = getMatchingTeams(row.roleName);

    for (const team of matchingTeams) {
      const teamSlug = team.slug;
      const uniqueKey = `${teamSlug}:${row.userId}`;

      if (seen.has(uniqueKey)) continue;

      roster[teamSlug].push({
        id: `${row.roleId}-${row.userId}`,
        name: getFullName(row.firstName, row.lastName, row.displayName),
        teamRole: team.label,
        quote: row.tagline?.trim() || null,
        imageUrl: getGuildProfilePictureUrl(row.guildProfilePictureUrl),
        color: row.roleColor,
      });
      seen.add(uniqueKey);
    }
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
