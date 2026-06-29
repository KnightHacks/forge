import type { RoleManagementInput } from "@forge/validators";
import { PERMISSIONS } from "@forge/consts";

export interface DiscordRoleSummary {
  color: number;
  id: string;
  managed: boolean;
  name: string;
  position: number;
}

export interface LinkableDiscordRole extends DiscordRoleSummary {
  hexColor: string | null;
  memberCount: number | null;
}

export interface RoleUserCandidate {
  discordUserId: string;
  email: string | null;
  id: string;
  memberName: string | null;
  name: string | null;
  roleIds: string[];
}

export function permissionKeysToBitstring(
  keys: readonly PERMISSIONS.PermissionKey[],
) {
  const bits = Array.from(
    { length: Object.keys(PERMISSIONS.PERMISSION_DATA).length },
    () => "0",
  );
  for (const key of keys) {
    const permission = PERMISSIONS.PERMISSION_DATA[key];
    if (permission) bits[permission.idx] = "1";
  }
  return bits.join("");
}

export function permissionBitstringToKeys(bitstring: string) {
  return Object.entries(PERMISSIONS.PERMISSION_DATA)
    .filter(([, permission]) => bitstring.at(permission.idx) === "1")
    .sort(([, left], [, right]) => left.idx - right.idx)
    .map(([key]) => key);
}

export function isCosmeticPermissionString(bitstring: string) {
  return permissionBitstringToKeys(bitstring).length === 0;
}

function discordRoleColorToHex(color: number) {
  if (color <= 0) return null;
  return `#${color.toString(16).padStart(6, "0")}`;
}

export function filterDiscordRolesForLinking({
  guildId,
  linkedRoleIds,
  memberCounts,
  roles,
}: {
  guildId: string;
  linkedRoleIds: ReadonlySet<string>;
  memberCounts: Readonly<Record<string, number>> | null;
  roles: readonly DiscordRoleSummary[];
}): LinkableDiscordRole[] {
  return roles
    .filter(
      (role) =>
        role.id !== guildId && !role.managed && !linkedRoleIds.has(role.id),
    )
    .sort(
      (left, right) =>
        right.position - left.position || left.name.localeCompare(right.name),
    )
    .map((role) => ({
      ...role,
      hexColor: discordRoleColorToHex(role.color),
      memberCount: memberCounts?.[role.id] ?? null,
    }));
}

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function editDistance(left: string, right: string) {
  const prior = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const next = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      next[rightIndex] = Math.min(
        (prior[rightIndex] ?? 0) + 1,
        (next[rightIndex - 1] ?? 0) + 1,
        (prior[rightIndex - 1] ?? 0) + cost,
      );
    }
    prior.splice(0, prior.length, ...next);
  }
  return prior[right.length] ?? Number.POSITIVE_INFINITY;
}

function roleUserSearchScore(user: RoleUserCandidate, query: string) {
  const normalized = normalizeSearchValue(query);
  if (!normalized) return 0;
  const searchable = normalizeSearchValue(
    [
      user.memberName ?? "",
      user.name ?? "",
      user.email ?? "",
      user.discordUserId,
    ].join(" "),
  );
  const words = searchable.split(" ");
  if (searchable === normalized) return 1_000;
  if (words.includes(normalized)) return 950;
  if (words.some((word) => word.startsWith(normalized))) return 850;
  if (searchable.includes(normalized)) return 800;
  const distance = Math.min(
    ...words.map((word) => editDistance(normalized, word)),
  );
  const allowedDistance = normalized.length <= 4 ? 1 : 2;
  return distance <= allowedDistance ? 600 - distance * 50 : null;
}

export function filterRoleUsers(
  candidates: readonly RoleUserCandidate[],
  input: RoleManagementInput,
) {
  const ranked = candidates
    .filter((user) =>
      input.userRoleIds.every((roleId) => user.roleIds.includes(roleId)),
    )
    .flatMap((user) => {
      const score = roleUserSearchScore(user, input.userQuery);
      return score == null ? [] : [{ score, user }];
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        (left.user.name ?? "").localeCompare(right.user.name ?? "") ||
        left.user.id.localeCompare(right.user.id),
    );
  const totalCount = ranked.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / input.pageSize));
  const page = Math.min(input.page, pageCount);
  const start = (page - 1) * input.pageSize;

  return {
    pagination: { page, pageCount, pageSize: input.pageSize, totalCount },
    users: ranked.slice(start, start + input.pageSize).map(({ user }) => user),
  };
}

export function planRoleMembershipSync(
  users: readonly {
    assignmentIds: string[];
    discordHasRole: boolean;
    userId: string;
  }[],
) {
  const addUserIds: string[] = [];
  const removeAssignmentIds: string[] = [];
  let unchangedCount = 0;

  for (const user of users) {
    if (user.discordHasRole) {
      if (user.assignmentIds.length === 0) addUserIds.push(user.userId);
      else {
        unchangedCount += 1;
        removeAssignmentIds.push(...user.assignmentIds.slice(1));
      }
    } else if (user.assignmentIds.length > 0) {
      removeAssignmentIds.push(...user.assignmentIds);
    } else {
      unchangedCount += 1;
    }
  }

  return { addUserIds, removeAssignmentIds, unchangedCount };
}

export function isAdministrativePermissionString(bitstring: string) {
  const officerIndex = PERMISSIONS.PERMISSIONS.IS_OFFICER;
  const configureIndex = PERMISSIONS.PERMISSIONS.CONFIGURE_ROLES;
  return (
    (officerIndex != null && bitstring.at(officerIndex) === "1") ||
    (configureIndex != null && bitstring.at(configureIndex) === "1")
  );
}

export function retainsAssignedRoleAdministrator({
  assignments,
  nextPermissionsByRole,
  roles,
}: {
  assignments: readonly { roleId: string; userId: string }[];
  nextPermissionsByRole: ReadonlyMap<string, string | null>;
  roles: readonly { id: string; permissions: string }[];
}) {
  const permissionsByRole = new Map(
    roles.map((role) => [
      role.id,
      nextPermissionsByRole.has(role.id)
        ? nextPermissionsByRole.get(role.id)
        : role.permissions,
    ]),
  );
  return assignments.some((assignment) => {
    const bitstring = permissionsByRole.get(assignment.roleId);
    return (
      typeof bitstring === "string" &&
      isAdministrativePermissionString(bitstring)
    );
  });
}

export function retainsAssignedRoleAdministratorAfterRevocations({
  assignments,
  revokedRoleIds,
  revokedUserIds,
  roles,
}: {
  assignments: readonly { roleId: string; userId: string }[];
  revokedRoleIds: ReadonlySet<string>;
  revokedUserIds: ReadonlySet<string>;
  roles: readonly { id: string; permissions: string }[];
}) {
  const administrativeRoleIds = new Set(
    roles
      .filter((role) => isAdministrativePermissionString(role.permissions))
      .map((role) => role.id),
  );
  return assignments.some(
    (assignment) =>
      administrativeRoleIds.has(assignment.roleId) &&
      !(
        revokedRoleIds.has(assignment.roleId) &&
        revokedUserIds.has(assignment.userId)
      ),
  );
}

interface BatchRole {
  discordRoleId: string;
  id: string;
}

interface BatchUser {
  discordUserId: string;
  id: string;
}

export interface BatchResultPair {
  compensated?: boolean;
  roleId: string;
  stage?: "blade" | "discord";
  userId: string;
}

export async function runRoleAssignmentBatch({
  action,
  existingPairs,
  grantBlade,
  grantDiscord,
  revokeBlade,
  revokeDiscord,
  roles,
  users,
}: {
  action: "grant" | "revoke";
  existingPairs: ReadonlySet<string>;
  grantBlade: (userId: string, roleId: string) => Promise<void>;
  grantDiscord: (discordUserId: string, discordRoleId: string) => Promise<void>;
  revokeBlade: (userId: string, roleId: string) => Promise<void>;
  revokeDiscord: (
    discordUserId: string,
    discordRoleId: string,
  ) => Promise<void>;
  roles: readonly BatchRole[];
  users: readonly BatchUser[];
}) {
  const succeeded: BatchResultPair[] = [];
  const skipped: BatchResultPair[] = [];
  const failed: BatchResultPair[] = [];

  for (const role of roles) {
    for (const user of users) {
      const pair = { roleId: role.id, userId: user.id };
      const exists = existingPairs.has(`${user.id}:${role.id}`);
      if ((action === "grant" && exists) || (action === "revoke" && !exists)) {
        skipped.push(pair);
        continue;
      }

      const discordAction = action === "grant" ? grantDiscord : revokeDiscord;
      try {
        await discordAction(user.discordUserId, role.discordRoleId);
      } catch {
        failed.push({ ...pair, stage: "discord" });
        continue;
      }

      try {
        if (action === "grant") await grantBlade(user.id, role.id);
        else await revokeBlade(user.id, role.id);
        succeeded.push(pair);
      } catch {
        const compensation = action === "grant" ? revokeDiscord : grantDiscord;
        const compensated = await compensation(
          user.discordUserId,
          role.discordRoleId,
        ).then(
          () => true,
          () => false,
        );
        failed.push({ ...pair, compensated, stage: "blade" });
      }
    }
  }

  return { failed, skipped, succeeded };
}
