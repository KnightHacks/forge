import { TEAM } from "@forge/consts";
import { and, eq, inArray } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles, User } from "@forge/db/schemas/auth";
import { Member } from "@forge/db/schemas/knight-hacks";

// Backs the public Club site's team page, which reads it over HTTP tRPC because
// apps/club builds with `output: "export"` and has no server runtime. Reforge's
// guild router rewrite dropped this, so the Club roster rendered empty; it is
// restored here rather than inline because the role-bucketing rules below are
// the bulk of the logic and are worth testing without a tRPC context.
//
// Roster contract: only opted-in Guild profiles are returned, and the payload is
// limited to fields intentionally shown on the team page.
export interface PublicClubTeamMember {
  id: string;
  name: string;
  teamRole: string;
  imageUrl: string | null;
  linkedinUrl: string | null;
  color: string | null;
}

export type PublicClubTeamRoster = Record<
  TEAM.ClubTeamSlug,
  PublicClubTeamMember[]
>;

function createEmptyPublicClubRoster(): PublicClubTeamRoster {
  return TEAM.CLUB_TEAM_DEFINITIONS.reduce((roster, team) => {
    roster[team.slug] = [];
    return roster;
  }, {} as PublicClubTeamRoster);
}

function getFullName({
  firstName,
  lastName,
  displayName,
}: {
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
}) {
  const memberName = [firstName, lastName].filter(Boolean).join(" ").trim();

  if (memberName.length > 0) return memberName;
  if (displayName?.trim()) return displayName.trim();

  return "Knight Hacks Member";
}

function toNonEmptyString(value: string | null) {
  const trimmedValue = value?.trim();

  return trimmedValue && trimmedValue.length > 0 ? trimmedValue : null;
}

interface RoleBucketAssignment {
  slug: TEAM.ClubTeamSlug;
  teamRole: string;
  rolePriority: number;
}

interface RosterRoleRow {
  roleName: string;
  roleColor: string | null;
  userId: string;
  displayName: string | null;
  memberId: string;
  firstName: string | null;
  lastName: string | null;
  guildProfilePictureUrl: string | null;
  linkedinProfileUrl: string | null;
}

function isClubExecutiveRole(
  roleName: string,
): roleName is (typeof TEAM.CLUB_EXECUTIVE_ROLE_ORDER)[number] {
  return TEAM.CLUB_EXECUTIVE_ROLE_ORDER.includes(
    roleName as (typeof TEAM.CLUB_EXECUTIVE_ROLE_ORDER)[number],
  );
}

function getDirectorRolePriority(roleName: string) {
  const displayRole =
    roleName === TEAM.CLUB_AGGREGATE_DIRECTOR_ROLE ? "Director" : roleName;
  const index = TEAM.CLUB_DIRECTOR_ROLE_ORDER.indexOf(
    displayRole as (typeof TEAM.CLUB_DIRECTOR_ROLE_ORDER)[number],
  );

  return index === -1 ? TEAM.CLUB_DIRECTOR_ROLE_ORDER.length : index;
}

function isClubExecutiveOfficerRole(roleName: string) {
  return (
    roleName === TEAM.CLUB_AGGREGATE_EXECUTIVE_ROLE ||
    (isClubExecutiveRole(roleName) &&
      roleName !== "Hack Lead" &&
      roleName !== "Dev Lead")
  );
}

function isClubDirectorRole(roleName: string) {
  if (roleName === TEAM.CLUB_AGGREGATE_DIRECTOR_ROLE) return true;

  return (TEAM.CLUB_DIRECTOR_ROLE_ORDER as readonly string[]).includes(
    roleName,
  );
}

function isClubTeamMembershipRole(roleName: string) {
  return Object.values(TEAM.CLUB_TEAM_ROLE_CONFIG).some(
    (config) => config.teamRoleName === roleName,
  );
}

function shouldSkipTeamMembershipAssignment(
  userRoleNames: readonly string[],
  sourceRoleName: string,
) {
  if (!isClubTeamMembershipRole(sourceRoleName)) return false;

  return userRoleNames.some(
    (roleName) =>
      isClubExecutiveOfficerRole(roleName) ||
      roleName === "Hack Lead" ||
      roleName === "Dev Lead" ||
      isClubDirectorRole(roleName),
  );
}

function getRoleBucketAssignments(roleName: string): RoleBucketAssignment[] {
  if (isClubExecutiveRole(roleName)) {
    const assignments: RoleBucketAssignment[] = [
      {
        slug: "executive",
        teamRole: roleName,
        rolePriority: TEAM.CLUB_EXECUTIVE_ROLE_ORDER.indexOf(roleName),
      },
    ];

    if (roleName === "Hack Lead") {
      assignments.push({
        slug: "hackathon",
        teamRole: roleName,
        rolePriority: 0,
      });
    }

    if (roleName === "Dev Lead") {
      assignments.push({
        slug: "development",
        teamRole: roleName,
        rolePriority: 0,
      });
    }

    return assignments;
  }

  if (roleName === TEAM.CLUB_AGGREGATE_EXECUTIVE_ROLE) {
    return [
      {
        slug: "executive",
        teamRole: TEAM.CLUB_AGGREGATE_EXECUTIVE_ROLE,
        rolePriority: TEAM.CLUB_EXECUTIVE_ROLE_ORDER.length,
      },
    ];
  }

  if (roleName === TEAM.CLUB_AGGREGATE_DIRECTOR_ROLE) {
    return [
      {
        slug: "directors",
        teamRole: "Director",
        rolePriority: getDirectorRolePriority(roleName),
      },
    ];
  }

  for (const slug of Object.keys(
    TEAM.CLUB_TEAM_ROLE_CONFIG,
  ) as TEAM.ClubTeamRoleSlug[]) {
    const config = TEAM.CLUB_TEAM_ROLE_CONFIG[slug];

    if (roleName === config.leadRoleName) {
      const assignments: RoleBucketAssignment[] = [
        {
          slug: "directors",
          teamRole: roleName,
          rolePriority: getDirectorRolePriority(roleName),
        },
        {
          slug,
          teamRole: roleName,
          rolePriority: 0,
        },
      ];

      return assignments;
    }

    if (roleName === config.teamRoleName) {
      return [
        {
          slug,
          teamRole: config.label,
          rolePriority: 1,
        },
      ];
    }
  }

  const specificDirectorRoles = TEAM.CLUB_DIRECTOR_ROLE_ORDER.filter(
    (role) => role !== "Director",
  );

  if ((specificDirectorRoles as readonly string[]).includes(roleName)) {
    return [
      {
        slug: "directors",
        teamRole: roleName,
        rolePriority: getDirectorRolePriority(roleName),
      },
    ];
  }

  return [];
}

function getExecutiveSortOrder(roleLabel: string) {
  const index = TEAM.CLUB_EXECUTIVE_ROLE_ORDER.findIndex(
    (label) => label === roleLabel,
  );

  if (index !== -1) return index;

  if (roleLabel === TEAM.CLUB_AGGREGATE_EXECUTIVE_ROLE) {
    return TEAM.CLUB_EXECUTIVE_ROLE_ORDER.length;
  }

  return TEAM.CLUB_EXECUTIVE_ROLE_ORDER.length + 1;
}

function getDirectorSortOrder(roleLabel: string) {
  const index = TEAM.CLUB_DIRECTOR_ROLE_ORDER.findIndex(
    (label) => label === roleLabel,
  );

  return index === -1 ? TEAM.CLUB_DIRECTOR_ROLE_ORDER.length : index;
}

function getTeamLeadSortOrder(slug: TEAM.ClubTeamSlug, teamRole: string) {
  const teamConfig =
    slug in TEAM.CLUB_TEAM_ROLE_CONFIG
      ? TEAM.CLUB_TEAM_ROLE_CONFIG[slug as TEAM.ClubTeamRoleSlug]
      : null;

  if (!teamConfig) return 1;

  return teamRole === teamConfig.leadRoleName ? 0 : 1;
}

function sortPublicClubRoster(roster: PublicClubTeamRoster) {
  for (const team of TEAM.CLUB_TEAM_DEFINITIONS) {
    roster[team.slug].sort((first, second) => {
      if (team.slug === "executive") {
        const firstOrder = getExecutiveSortOrder(first.teamRole);
        const secondOrder = getExecutiveSortOrder(second.teamRole);

        if (firstOrder !== secondOrder) return firstOrder - secondOrder;
      }

      if (team.slug === "directors") {
        const firstOrder = getDirectorSortOrder(first.teamRole);
        const secondOrder = getDirectorSortOrder(second.teamRole);

        if (firstOrder !== secondOrder) return firstOrder - secondOrder;
      }

      if (team.slug in TEAM.CLUB_TEAM_ROLE_CONFIG) {
        const firstOrder = getTeamLeadSortOrder(team.slug, first.teamRole);
        const secondOrder = getTeamLeadSortOrder(team.slug, second.teamRole);

        if (firstOrder !== secondOrder) return firstOrder - secondOrder;
      }

      return first.name.localeCompare(second.name);
    });
  }

  return roster;
}

export async function getVisiblePublicClubRoster() {
  const rows = await db
    .select({
      roleName: Roles.name,
      roleColor: Roles.teamHexcodeColor,
      userId: User.id,
      displayName: User.name,
      memberId: Member.id,
      firstName: Member.firstName,
      lastName: Member.lastName,
      guildProfilePictureUrl: Member.profilePictureUrl,
      linkedinProfileUrl: Member.linkedinProfileUrl,
    })
    .from(Roles)
    .innerJoin(Permissions, eq(Permissions.roleId, Roles.id))
    .innerJoin(User, eq(User.id, Permissions.userId))
    .innerJoin(Member, eq(Member.userId, User.id))
    .where(
      and(
        inArray(Roles.name, [...TEAM.CLUB_ROSTER_ROLE_NAMES]),
        eq(Member.guildProfileVisible, true),
      ),
    )
    .orderBy(Roles.name, Member.firstName, Member.lastName, User.name);

  const roster = createEmptyPublicClubRoster();
  const rowsByUserId = new Map<string, RosterRoleRow[]>();

  for (const row of rows) {
    rowsByUserId.set(row.userId, [
      ...(rowsByUserId.get(row.userId) ?? []),
      row,
    ]);
  }

  for (const userRows of rowsByUserId.values()) {
    const userRoleNames = userRows.map((row) => row.roleName);
    const bucketAssignments = new Map<
      TEAM.ClubTeamSlug,
      { teamRole: string; rolePriority: number; row: RosterRoleRow }
    >();

    for (const row of userRows) {
      for (const assignment of getRoleBucketAssignments(row.roleName)) {
        if (shouldSkipTeamMembershipAssignment(userRoleNames, row.roleName)) {
          continue;
        }

        const existing = bucketAssignments.get(assignment.slug);

        if (!existing || assignment.rolePriority < existing.rolePriority) {
          bucketAssignments.set(assignment.slug, {
            teamRole: assignment.teamRole,
            rolePriority: assignment.rolePriority,
            row,
          });
        }
      }
    }

    for (const [slug, assignment] of bucketAssignments) {
      const { row, teamRole } = assignment;

      roster[slug].push({
        id: `${slug}-${row.memberId}`,
        name: getFullName({
          firstName: row.firstName,
          lastName: row.lastName,
          displayName: row.displayName,
        }),
        teamRole,
        imageUrl: toNonEmptyString(row.guildProfilePictureUrl),
        linkedinUrl: toNonEmptyString(row.linkedinProfileUrl),
        color: row.roleColor,
      });
    }
  }

  return sortPublicClubRoster(roster);
}
