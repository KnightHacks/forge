import type { TEAM } from "@forge/consts";
import { asc, eq } from "@forge/db";
import { db } from "@forge/db/client";
import { Roles } from "@forge/db/schemas/auth";
import { ClubTeam, ClubTeamRole } from "@forge/db/schemas/club-team";

import type { WriteDb } from "../db";

// The club roster's configuration, loaded from `knight_hacks_club_team` and
// `knight_hacks_club_team_role`.
//
// Both consumers — the public Club team page and the Guild profile role badge —
// used to read the same block of constants in `@forge/consts`, each with its own
// copy of the "which name means what" rules. They read this instead, so a team
// added or renamed in the database shows up in both without a deploy.
//
// The label fallbacks below are the reason this is a module and not two queries.
// They are small, they are shared, and when they disagreed the two surfaces
// disagreed about what to call the same person.

export interface ClubTeamDefinition {
  slug: string;
  label: string;
  heading: string;
  kind: TEAM.ClubTeamKind;
  displayOrder: number;
}

export interface ClubRoleClassification {
  roleId: string;
  roleName: string;
  kind: TEAM.ClubTeamKind;
  rank: number;
  teamSlug: string | null;
  rosterLabel: string | null;
  calloutLabel: string | null;
}

export interface ClubTeamConfig {
  /** Every bucket the Club site renders, in tab order. */
  teams: ClubTeamDefinition[];
  /** Classified roles, keyed by `auth_roles.id`. */
  rolesById: Map<string, ClubRoleClassification>;
}

/** One bucket a role places its holder into, and how it labels them there. */
export interface ClubRosterBucketAssignment {
  teamSlug: string;
  teamRole: string;
  rolePriority: number;
}

export function createClubTeamConfig(
  teams: ClubTeamDefinition[],
  roles: ClubRoleClassification[],
): ClubTeamConfig {
  return {
    teams,
    rolesById: new Map(roles.map((role) => [role.roleId, role])),
  };
}

export async function loadClubTeamConfig(
  database: WriteDb = db,
): Promise<ClubTeamConfig> {
  const [teams, roles] = await Promise.all([
    database
      .select({
        displayOrder: ClubTeam.displayOrder,
        heading: ClubTeam.heading,
        kind: ClubTeam.kind,
        label: ClubTeam.label,
        slug: ClubTeam.slug,
      })
      .from(ClubTeam)
      .orderBy(asc(ClubTeam.displayOrder)),
    database
      .select({
        calloutLabel: ClubTeamRole.calloutLabel,
        kind: ClubTeamRole.kind,
        rank: ClubTeamRole.rank,
        roleId: ClubTeamRole.roleId,
        roleName: Roles.name,
        rosterLabel: ClubTeamRole.rosterLabel,
        teamSlug: ClubTeam.slug,
      })
      .from(ClubTeamRole)
      .innerJoin(Roles, eq(Roles.id, ClubTeamRole.roleId))
      .leftJoin(ClubTeam, eq(ClubTeam.id, ClubTeamRole.teamId)),
  ]);

  return createClubTeamConfig(teams, roles);
}

function findTeam(config: ClubTeamConfig, slug: string | null) {
  if (!slug) return null;
  return config.teams.find((team) => team.slug === slug) ?? null;
}

/**
 * The bucket an `executive` or `director` role collects into.
 *
 * Looked up by kind rather than by a literal `"executive"` slug so those two
 * buckets can be renamed like any other team.
 */
function findKindBucket(config: ClubTeamConfig, kind: TEAM.ClubTeamKind) {
  return config.teams.find((team) => team.kind === kind) ?? null;
}

/**
 * What a member's card says under their name.
 *
 * A plain team member is labelled by their team ("Design"), because the role
 * name is an implementation detail of Discord — the Discord role is literally
 * called "KH IX Team". Everyone else is labelled by their role.
 */
export function getClubRosterLabel(
  config: ClubTeamConfig,
  role: ClubRoleClassification,
): string {
  if (role.rosterLabel) return role.rosterLabel;
  if (role.kind !== "team") return role.roleName;

  return findTeam(config, role.teamSlug)?.label ?? role.roleName;
}

/** What the Guild profile badge says. */
export function getClubCalloutLabel(
  config: ClubTeamConfig,
  role: ClubRoleClassification,
): string {
  if (role.calloutLabel) return role.calloutLabel;
  if (role.kind !== "team") return role.roleName;

  const team = findTeam(config, role.teamSlug);

  return team ? `${team.label} Team` : role.roleName;
}

/**
 * How a role ranks against the member's other roles of the same category.
 *
 * Officers and directors carry their own rank. Team roles do not — there is one
 * per team and they all rank alike — so the team's own position in the tab strip
 * decides, which is what the deleted `CLUB_TEAM_ROLE_CONFIG` key order did.
 */
export function getClubCalloutPriority(
  config: ClubTeamConfig,
  role: ClubRoleClassification,
): number {
  if (role.kind !== "team") return role.rank;

  return findTeam(config, role.teamSlug)?.displayOrder ?? role.rank;
}

/**
 * Every bucket a single role places its holder into.
 *
 * Most roles produce one. A team lead produces two — their own tier plus the
 * front of the team they lead — which is why "Hack Lead" appears under both
 * Executive Officers and Hackathon.
 */
export function getClubRoleBuckets(
  config: ClubTeamConfig,
  role: ClubRoleClassification,
): ClubRosterBucketAssignment[] {
  const teamRole = getClubRosterLabel(config, role);

  if (role.kind === "team") {
    const team = findTeam(config, role.teamSlug);

    return team
      ? [{ teamSlug: team.slug, teamRole, rolePriority: role.rank }]
      : [];
  }

  const buckets: ClubRosterBucketAssignment[] = [];
  const kindBucket = findKindBucket(config, role.kind);

  if (kindBucket) {
    buckets.push({
      teamSlug: kindBucket.slug,
      teamRole,
      rolePriority: role.rank,
    });
  }

  const ledTeam = findTeam(config, role.teamSlug);

  if (ledTeam) {
    // Leads sort ahead of every plain member of the team they lead.
    buckets.push({ teamSlug: ledTeam.slug, teamRole, rolePriority: 0 });
  }

  return buckets;
}

/**
 * True when a role's team membership should not be shown.
 *
 * Officers and directors are listed in their own tier and, if they lead a team,
 * at the top of it. Their plain membership of some other team is suppressed so
 * they are not also listed a third time as a rank-and-file member.
 */
export function holdsClubLeadershipRole(
  config: ClubTeamConfig,
  roleIds: readonly string[],
): boolean {
  return roleIds.some((roleId) => {
    const role = config.rolesById.get(roleId);

    return role !== undefined && role.kind !== "team";
  });
}
