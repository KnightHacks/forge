import { TRPCError } from "@trpc/server";

import type { JOB_BOARD } from "@forge/consts";
import type { db as DatabaseClient } from "@forge/db/client";
import type { DigestOptInInput } from "@forge/validators";
import { and, eq } from "@forge/db";
import { Roles, User } from "@forge/db/schemas/auth";
import { Member } from "@forge/db/schemas/knight-hacks";
import { logger } from "@forge/utils";
import {
  addRoleToMember,
  listGuildMemberPages,
  removeRoleFromMember,
} from "@forge/utils/discord";
import {
  getDiscordConfigId,
  getKnightHacksGuildId,
} from "@forge/utils/discord-config";
import { discordSnowflakeSchema } from "@forge/validators";

import type { WriteDb } from "../db";

export interface DigestRoleGateway {
  getRoleId: (track: JOB_BOARD.JobTrack) => Promise<string>;
  listRoleMemberIds: (roleId: string) => Promise<readonly string[]>;
  grantRole: (discordUserId: string, roleId: string) => Promise<void>;
  revokeRole: (discordUserId: string, roleId: string) => Promise<void>;
}

const digestFields = {
  internship: "jobInternshipDigestEnabled",
  new_grad: "jobNewGradDigestEnabled",
} as const satisfies Record<JOB_BOARD.JobTrack, keyof typeof Member>;

const roleIdReaders = {
  internship: () => getDiscordConfigId("career_internship_digest_role"),
  new_grad: () => getDiscordConfigId("career_new_grad_digest_role"),
} satisfies Record<JOB_BOARD.JobTrack, () => Promise<string>>;

const discordGateway: DigestRoleGateway = {
  getRoleId: (track) => roleIdReaders[track](),
  async listRoleMemberIds(roleId) {
    const guildId = await getKnightHacksGuildId();
    const userIds: string[] = [];
    for await (const page of listGuildMemberPages(guildId)) {
      for (const member of page) {
        if (member.roles.includes(roleId)) userIds.push(member.user.id);
      }
    }
    return userIds;
  },
  grantRole: addRoleToMember,
  revokeRole: removeRoleFromMember,
};

function memberNotFound() {
  return new TRPCError({ code: "NOT_FOUND", message: "Member not found." });
}

async function resolveDigestRoleId(
  db: WriteDb,
  track: JOB_BOARD.JobTrack,
  gateway: DigestRoleGateway,
) {
  const otherTrack = track === "internship" ? "new_grad" : "internship";
  const [roleId, otherRoleId] = await Promise.all([
    gateway.getRoleId(track),
    gateway.getRoleId(otherTrack),
  ]);
  if (roleId === otherRoleId) {
    throw new Error("Career digest tracks must use different Discord roles.");
  }

  const [linkedRole] = await db
    .select({ id: Roles.id })
    .from(Roles)
    .where(eq(Roles.discordRoleId, roleId))
    .limit(1);
  if (linkedRole) {
    throw new Error(
      "The configured digest role is linked to Blade permissions.",
    );
  }
  return roleId;
}

function selectDigestSubscribers(
  db: WriteDb,
  track: JOB_BOARD.JobTrack,
  discordUserId?: string,
) {
  return db
    .select({ discordUserId: User.discordUserId })
    .from(Member)
    .innerJoin(User, eq(User.id, Member.userId))
    .where(
      and(
        eq(Member[digestFields[track]], true),
        discordUserId === undefined
          ? undefined
          : eq(User.discordUserId, discordUserId),
      ),
    );
}

async function setRoleMembership(
  gateway: DigestRoleGateway,
  discordUserId: string,
  roleId: string,
  enabled: boolean,
) {
  if (enabled) {
    await gateway.grantRole(discordUserId, roleId);
  } else {
    await gateway.revokeRole(discordUserId, roleId);
  }
}

function logRoleFailure(
  track: JOB_BOARD.JobTrack,
  discordUserId: string,
  error: unknown,
) {
  logger.warn(
    `Could not sync the Career digest role for ${track} and Discord user ${discordUserId}.`,
    error instanceof Error ? error.message : "Unknown error",
  );
}

/** The two stored digest choices for a member. */
export async function listDigestSubscriptions(db: WriteDb, memberId: string) {
  const [subscriptions] = await db
    .select({
      internship: Member[digestFields.internship],
      new_grad: Member[digestFields.new_grad],
    })
    .from(Member)
    .where(eq(Member.id, memberId))
    .limit(1);

  if (!subscriptions) throw memberNotFound();
  return subscriptions;
}

/** Save the requested choice before attempting to mirror it in Discord. */
export async function setDigestSubscription(
  db: typeof DatabaseClient,
  memberId: string,
  { track, enabled }: DigestOptInInput,
  gateway: DigestRoleGateway = discordGateway,
) {
  // Use the database client so this single statement commits before Discord I/O.
  const [member] = await db
    .update(Member)
    .set({ [digestFields[track]]: enabled })
    .from(User)
    .where(and(eq(Member.id, memberId), eq(User.id, Member.userId)))
    .returning({ discordUserId: User.discordUserId });

  if (!member) throw memberNotFound();
  const { discordUserId } = member;
  if (!discordSnowflakeSchema.safeParse(discordUserId).success) {
    return { enabled, roleSynced: false };
  }

  try {
    const roleId = await resolveDigestRoleId(db, track, gateway);
    // Another member record may share this Discord identity. Keep the role
    // while any record for the account is still subscribed to this track.
    const [subscriber] = await selectDigestSubscribers(
      db,
      track,
      discordUserId,
    ).limit(1);
    await setRoleMembership(
      gateway,
      discordUserId,
      roleId,
      Boolean(subscriber),
    );
    return { enabled, roleSynced: true };
  } catch (error) {
    logRoleFailure(track, discordUserId, error);
    return { enabled, roleSynced: false };
  }
}

/** Mirror the saved choices in a dedicated role after reading all current members. */
export async function reconcileDigestRole(
  db: typeof DatabaseClient,
  track: JOB_BOARD.JobTrack,
  gateway: DigestRoleGateway = discordGateway,
) {
  const roleId = await resolveDigestRoleId(db, track, gateway);
  const current = new Set(await gateway.listRoleMemberIds(roleId));
  const subscribers = await selectDigestSubscribers(db, track);
  const desired = new Set<string>();
  for (const { discordUserId } of subscribers) {
    if (discordSnowflakeSchema.safeParse(discordUserId).success) {
      desired.add(discordUserId);
    }
  }

  const counts = { granted: 0, revoked: 0, failed: 0 };
  async function repairMembership(discordUserId: string, enabled: boolean) {
    try {
      await setRoleMembership(gateway, discordUserId, roleId, enabled);
      counts[enabled ? "granted" : "revoked"]++;
    } catch (error) {
      counts.failed++;
      logRoleFailure(track, discordUserId, error);
    }
  }

  for (const discordUserId of current) {
    if (!desired.has(discordUserId))
      await repairMembership(discordUserId, false);
  }
  for (const discordUserId of desired) {
    if (!current.has(discordUserId))
      await repairMembership(discordUserId, true);
  }

  return counts;
}
