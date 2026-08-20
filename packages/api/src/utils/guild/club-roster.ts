import { eq } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles, User } from "@forge/db/schemas/auth";
import { ClubTeamRole } from "@forge/db/schemas/club-team";
import { Member } from "@forge/db/schemas/knight-hacks";

import type { ClubTeamConfig } from "./club-team-config";
import type { PublicProfilePictureReference } from "./profile-picture";
import {
  getClubRoleBuckets,
  holdsClubLeadershipRole,
  loadClubTeamConfig,
} from "./club-team-config";
import { getPublicProfilePictureUrl } from "./profile-picture";

// Backs the public Club site's team page, which reads it over HTTP tRPC because
// apps/club builds with `output: "export"` and has no server runtime. This stays
// outside the router because the role-bucketing rules below are the bulk of the
// logic and are worth testing without a tRPC context.
//
// Which teams exist, and which role belongs to which, used to be constants in
// `@forge/consts` matched against `Roles.name`. Both now come from
// `knight_hacks_club_team*` through `./club-team-config`, matched on `Roles.id`,
// so renaming a Discord role changes a label instead of emptying a team.
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

/**
 * The Club site cannot query the database, so the team list travels with the
 * members rather than being compiled into its static export.
 */
export interface PublicClubTeamRoster {
  teams: { slug: string; label: string; heading: string }[];
  members: Record<string, PublicClubTeamMember[]>;
}

export interface RosterRoleRow {
  roleId: string;
  roleColor: string | null;
  userId: string;
  displayName: string | null;
  memberId: string;
  firstName: string | null;
  lastName: string | null;
  guildProfilePictureUrl: string | null;
  linkedinProfileUrl: string | null;
}

export type RosterRoleReferenceRow = Omit<
  RosterRoleRow,
  "guildProfilePictureUrl"
> & {
  profilePictureReference: string | null;
};

type PublicProfilePictureResolver = (
  reference: PublicProfilePictureReference,
) => Promise<string | null>;

/** A placed member plus the ranking that placed them. Never leaves this module. */
interface RankedClubTeamMember {
  member: PublicClubTeamMember;
  rolePriority: number;
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

/**
 * Buckets roster rows without touching the database, so the rules that decide
 * who appears where — and in what order — stay testable on their own.
 */
export function buildPublicClubRoster(
  config: ClubTeamConfig,
  rows: readonly RosterRoleRow[],
): PublicClubTeamRoster {
  const ranked = new Map<string, RankedClubTeamMember[]>(
    config.teams.map((team) => [team.slug, []]),
  );
  const rowsByUserId = new Map<string, RosterRoleRow[]>();

  for (const row of rows) {
    rowsByUserId.set(row.userId, [
      ...(rowsByUserId.get(row.userId) ?? []),
      row,
    ]);
  }

  for (const userRows of rowsByUserId.values()) {
    // An officer or director who also holds a plain team role is listed in
    // their own tier, not a second time among that team's rank and file.
    const suppressTeamMembership = holdsClubLeadershipRole(
      config,
      userRows.map((row) => row.roleId),
    );
    const bucketAssignments = new Map<
      string,
      { teamRole: string; rolePriority: number; row: RosterRoleRow }
    >();

    for (const row of userRows) {
      const classification = config.rolesById.get(row.roleId);

      if (!classification) continue;
      if (classification.kind === "team" && suppressTeamMembership) continue;

      for (const assignment of getClubRoleBuckets(config, classification)) {
        const existing = bucketAssignments.get(assignment.teamSlug);

        if (!existing || assignment.rolePriority < existing.rolePriority) {
          bucketAssignments.set(assignment.teamSlug, {
            teamRole: assignment.teamRole,
            rolePriority: assignment.rolePriority,
            row,
          });
        }
      }
    }

    for (const [slug, assignment] of bucketAssignments) {
      const bucket = ranked.get(slug);

      if (!bucket) continue;

      const { row, teamRole } = assignment;

      bucket.push({
        rolePriority: assignment.rolePriority,
        member: {
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
        },
      });
    }
  }

  const members: Record<string, PublicClubTeamMember[]> = {};

  for (const team of config.teams) {
    const bucket = ranked.get(team.slug) ?? [];

    bucket.sort(
      (first, second) =>
        first.rolePriority - second.rolePriority ||
        first.member.name.localeCompare(second.member.name),
    );
    members[team.slug] = bucket.map(({ member }) => member);
  }

  return {
    teams: config.teams.map(({ slug, label, heading }) => ({
      slug,
      label,
      heading,
    })),
    members,
  };
}

export async function resolveRosterRoleRows(
  rows: readonly RosterRoleReferenceRow[],
  resolveProfilePicture: PublicProfilePictureResolver = getPublicProfilePictureUrl,
): Promise<RosterRoleRow[]> {
  const uniqueRowsByUserId = new Map(
    rows.map((row) => [row.userId, row] as const),
  );
  const profilePicturesByUserId = new Map(
    await Promise.all(
      [...uniqueRowsByUserId.values()].map(
        async (row) =>
          [
            row.userId,
            await resolveProfilePicture({
              profilePictureReference: row.profilePictureReference,
              userId: row.userId,
            }),
          ] as const,
      ),
    ),
  );

  return rows.map(({ profilePictureReference: _reference, ...row }) => ({
    ...row,
    guildProfilePictureUrl: profilePicturesByUserId.get(row.userId) ?? null,
  }));
}

export async function getVisiblePublicClubRoster() {
  const config = await loadClubTeamConfig();
  const rows = await db
    .select({
      roleId: Roles.id,
      roleColor: Roles.teamHexcodeColor,
      userId: User.id,
      displayName: User.name,
      memberId: Member.id,
      firstName: Member.firstName,
      lastName: Member.lastName,
      profilePictureReference: Member.profilePictureUrl,
      linkedinProfileUrl: Member.linkedinProfileUrl,
    })
    .from(ClubTeamRole)
    .innerJoin(Roles, eq(Roles.id, ClubTeamRole.roleId))
    .innerJoin(Permissions, eq(Permissions.roleId, Roles.id))
    .innerJoin(User, eq(User.id, Permissions.userId))
    .innerJoin(Member, eq(Member.userId, User.id))
    .where(eq(Member.guildProfileVisible, true))
    .orderBy(Roles.name, Member.firstName, Member.lastName, User.name);

  return buildPublicClubRoster(config, await resolveRosterRoleRows(rows));
}
