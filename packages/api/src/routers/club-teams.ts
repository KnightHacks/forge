import { TRPCError } from "@trpc/server";

import { TEAM } from "@forge/consts";
import { asc, eq } from "@forge/db";
import { db } from "@forge/db/client";
import { Roles } from "@forge/db/schemas/auth";
import { ClubTeam, ClubTeamRole } from "@forge/db/schemas/club-team";
import { clubClassificationUpdateSchema } from "@forge/validators";

import type { AuditChangeInput } from "../utils/audit/service";
import type {
  ClubRoleClassification,
  ClubTeamDefinition,
} from "../utils/guild/club-team-config";
import { createTRPCRouter, permProcedure } from "../trpc";
import {
  captureAdminAuditActor,
  createAdminAuditEvent,
} from "../utils/audit/service";
import {
  createClubTeamConfig,
  getClubCalloutLabel,
  getClubRosterLabel,
} from "../utils/guild/club-team-config";
import { assertCanManagePlatformConfig } from "../utils/platform-config/access";

type TeamRow = ClubTeamDefinition & { id: string };

interface ClassificationRow {
  calloutLabel: string | null;
  kind: TEAM.ClubTeamKind;
  rank: number;
  roleId: string;
  rosterLabel: string | null;
  teamId: string | null;
  updatedAt: Date;
}

/**
 * The resolved labels a classification produces today.
 *
 * They are computed, never stored, and they exist because a NULL override does
 * not mean the same thing for every `kind`: for a plain team member it means
 * "use the team's label", for everyone else "use the role name". An officer
 * editing a blank field with no idea what blank produces fills it in
 * defensively and creates an override the roster did not need.
 */
function resolveLabels(
  teams: TeamRow[],
  classification: ClassificationRow,
  roleName: string,
) {
  // The role list is empty on purpose: both label functions read only
  // `config.teams`, and the one classification being resolved is passed
  // separately.
  const config = createClubTeamConfig(teams, []);
  const role: ClubRoleClassification = {
    calloutLabel: classification.calloutLabel,
    kind: classification.kind,
    rank: classification.rank,
    roleId: classification.roleId,
    roleName,
    rosterLabel: classification.rosterLabel,
    teamSlug:
      teams.find((team) => team.id === classification.teamId)?.slug ?? null,
  };

  return {
    resolvedCalloutLabel: getClubCalloutLabel(config, role),
    resolvedRosterLabel: getClubRosterLabel(config, role),
  };
}

function toRoleView(
  teams: TeamRow[],
  role: { id: string; name: string; teamHexcodeColor: string | null },
  classification: ClassificationRow | undefined,
) {
  if (!classification) {
    return {
      classification: null,
      resolvedCalloutLabel: null,
      resolvedRosterLabel: null,
      roleId: role.id,
      roleName: role.name,
      teamHexcodeColor: role.teamHexcodeColor,
    };
  }

  return {
    classification: {
      calloutLabel: classification.calloutLabel,
      kind: classification.kind,
      rank: classification.rank,
      rosterLabel: classification.rosterLabel,
      teamId: classification.teamId,
      updatedAt: classification.updatedAt,
    },
    ...resolveLabels(teams, classification, role.name),
    roleId: role.id,
    roleName: role.name,
    teamHexcodeColor: role.teamHexcodeColor,
  };
}

type RoleView = ReturnType<typeof toRoleView>;

/**
 * Classified first by (kind, rank, name), then the unclassified by name, so the
 * rows the officer is meant to act on cluster at the bottom instead of being
 * scattered through eighteen classified ones.
 */
function byClassificationThenName(left: RoleView, right: RoleView) {
  if (!left.classification || !right.classification) {
    if (left.classification) return -1;
    if (right.classification) return 1;
    return left.roleName.localeCompare(right.roleName);
  }

  const kindDelta =
    TEAM.CLUB_TEAM_KINDS.indexOf(left.classification.kind) -
    TEAM.CLUB_TEAM_KINDS.indexOf(right.classification.kind);
  if (kindDelta !== 0) return kindDelta;

  return (
    left.classification.rank - right.classification.rank ||
    left.roleName.localeCompare(right.roleName)
  );
}

function classificationChanges(
  before: (ClassificationRow & { teamSlug: string | null }) | undefined,
  after: ClassificationRow & { teamSlug: string | null },
): AuditChangeInput[] {
  const fields = [
    "kind",
    "rank",
    "teamSlug",
    "rosterLabel",
    "calloutLabel",
  ] as const;

  // A first classification has no prior row, so every field is emitted with an
  // `after` and no `before`. An edit emits only what moved.
  if (!before) {
    return fields.map((field) => ({ after: after[field], field }));
  }

  return fields
    .filter((field) => before[field] !== after[field])
    .map((field) => ({ after: after[field], before: before[field], field }));
}

export const clubTeamsRouter = createTRPCRouter({
  /** Officer-only. Every club team as read-only context, and every Blade role's classification. */
  listConfiguration: permProcedure.query(async ({ ctx }) => {
    assertCanManagePlatformConfig(ctx.session.permissions);
    const [teams, roles, classifications] = await Promise.all([
      db
        .select({
          displayOrder: ClubTeam.displayOrder,
          heading: ClubTeam.heading,
          id: ClubTeam.id,
          kind: ClubTeam.kind,
          label: ClubTeam.label,
          slug: ClubTeam.slug,
        })
        .from(ClubTeam)
        .orderBy(asc(ClubTeam.displayOrder)),
      db
        .select({
          id: Roles.id,
          name: Roles.name,
          teamHexcodeColor: Roles.teamHexcodeColor,
        })
        .from(Roles),
      db
        .select({
          calloutLabel: ClubTeamRole.calloutLabel,
          kind: ClubTeamRole.kind,
          rank: ClubTeamRole.rank,
          roleId: ClubTeamRole.roleId,
          rosterLabel: ClubTeamRole.rosterLabel,
          teamId: ClubTeamRole.teamId,
          updatedAt: ClubTeamRole.updatedAt,
        })
        .from(ClubTeamRole),
    ]);

    const byRoleId = new Map(
      classifications.map((row) => [row.roleId, row] as const),
    );

    return {
      // `roles` is every linked Blade role, not only the classified ones. That
      // is what makes a first classification possible from this screen, and
      // what makes `pnpm db:club-roles` unnecessary on a fresh environment.
      roles: roles
        .map((role) => toRoleView(teams, role, byRoleId.get(role.id)))
        .sort(byClassificationThenName),
      teams: teams.map((team) => ({
        ...team,
        classifiedRoleCount: classifications.filter(
          (row) => row.teamId === team.id,
        ).length,
      })),
    };
  }),

  /** Officer-only. Classifies a Blade role, or gives an unclassified one its first classification. */
  updateClassification: permProcedure
    .input(clubClassificationUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManagePlatformConfig(ctx.session.permissions);
      const auditActor = await captureAdminAuditActor(ctx.session.user);

      return db.transaction(async (tx) => {
        // The `auth_roles` lock is the important one. `ClubTeamRole.roleId`
        // cascades on delete and `roles.unlinkRole` takes `FOR UPDATE` on this
        // same row before deleting it, so locking it here is what serialises
        // the two: either this classification commits and the unlink follows,
        // or the unlink commits first and this select returns nothing.
        // Locking only the classification row would leave a window where a
        // classification is written for a role being deleted and the cascade
        // swallows it silently.
        const [role] = await tx
          .select({
            id: Roles.id,
            name: Roles.name,
            teamHexcodeColor: Roles.teamHexcodeColor,
          })
          .from(Roles)
          .where(eq(Roles.id, input.roleId))
          .limit(1)
          .for("update");
        if (!role) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Role not found.",
          });
        }

        // Serialises two officers editing the same role, so the loser's audit
        // `before` is the winner's committed value rather than a stale read.
        // A no-row `FOR UPDATE` is a no-op, which is correct: `ON CONFLICT
        // (role_id)` is what makes the first-classification race safe.
        const [existing] = await tx
          .select({
            calloutLabel: ClubTeamRole.calloutLabel,
            kind: ClubTeamRole.kind,
            rank: ClubTeamRole.rank,
            roleId: ClubTeamRole.roleId,
            rosterLabel: ClubTeamRole.rosterLabel,
            teamId: ClubTeamRole.teamId,
            updatedAt: ClubTeamRole.updatedAt,
          })
          .from(ClubTeamRole)
          .where(eq(ClubTeamRole.roleId, input.roleId))
          .limit(1)
          .for("update");

        // Teams are read but not locked. `ClubTeamRole.teamId` is `ON DELETE
        // restrict`, so the FK check already takes a row-share lock and
        // Postgres already refuses to delete a referenced team.
        const teams = await tx
          .select({
            displayOrder: ClubTeam.displayOrder,
            heading: ClubTeam.heading,
            id: ClubTeam.id,
            kind: ClubTeam.kind,
            label: ClubTeam.label,
            slug: ClubTeam.slug,
          })
          .from(ClubTeam)
          .orderBy(asc(ClubTeam.displayOrder));
        const team = input.teamId
          ? teams.find((candidate) => candidate.id === input.teamId)
          : null;
        if (input.teamId && !team) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Team not found.",
          });
        }

        const [next] = await tx
          .insert(ClubTeamRole)
          .values({
            calloutLabel: input.calloutLabel,
            kind: input.kind,
            rank: input.rank,
            roleId: input.roleId,
            rosterLabel: input.rosterLabel,
            teamId: input.teamId,
          })
          .onConflictDoUpdate({
            set: {
              calloutLabel: input.calloutLabel,
              kind: input.kind,
              rank: input.rank,
              rosterLabel: input.rosterLabel,
              teamId: input.teamId,
            },
            target: ClubTeamRole.roleId,
          })
          .returning({
            calloutLabel: ClubTeamRole.calloutLabel,
            kind: ClubTeamRole.kind,
            rank: ClubTeamRole.rank,
            roleId: ClubTeamRole.roleId,
            rosterLabel: ClubTeamRole.rosterLabel,
            teamId: ClubTeamRole.teamId,
            updatedAt: ClubTeamRole.updatedAt,
          });
        if (!next) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Classification could not be written.",
          });
        }

        const slugFor = (teamId: string | null) =>
          teams.find((candidate) => candidate.id === teamId)?.slug ?? null;

        await createAdminAuditEvent(
          {
            actionKey: "role.club_classification.updated",
            actor: auditActor,
            changes: classificationChanges(
              existing && { ...existing, teamSlug: slugFor(existing.teamId) },
              { ...next, teamSlug: slugFor(next.teamId) },
            ),
            metadata: { created: existing === undefined },
            subjects: [
              {
                relation: "primary",
                targetId: role.id,
                targetLabel: role.name,
                targetType: "role",
              },
            ],
          },
          tx,
        );

        return toRoleView(teams, role, next);
      });
    }),
});
