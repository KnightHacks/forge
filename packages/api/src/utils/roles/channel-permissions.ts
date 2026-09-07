import type {
  APIChannel,
  APIGuildMember,
  APIRole,
} from "discord-api-types/v10";
import { OverwriteType, PermissionFlagsBits } from "discord-api-types/v10";

/** Discord applies everyone, combined role, then member channel overwrites. */
export function canSendToChannel(
  guildId: string,
  channel: APIChannel,
  member: APIGuildMember,
  roles: APIRole[],
) {
  const memberRoles = new Set(member.roles);
  let permissions = roles.reduce(
    (bits, role) =>
      role.id === guildId || memberRoles.has(role.id)
        ? bits | BigInt(role.permissions)
        : bits,
    0n,
  );
  if (permissions & PermissionFlagsBits.Administrator) return true;

  const overwrites =
    "permission_overwrites" in channel
      ? (channel.permission_overwrites ?? [])
      : [];
  const everyone = overwrites.find(
    (entry) => entry.type === OverwriteType.Role && entry.id === guildId,
  );
  if (everyone) {
    permissions =
      (permissions & ~BigInt(everyone.deny)) | BigInt(everyone.allow);
  }
  let roleAllow = 0n;
  let roleDeny = 0n;
  for (const entry of overwrites) {
    if (entry.type === OverwriteType.Role && memberRoles.has(entry.id)) {
      roleAllow |= BigInt(entry.allow);
      roleDeny |= BigInt(entry.deny);
    }
  }
  permissions = (permissions & ~roleDeny) | roleAllow;
  const personal = overwrites.find(
    (entry) =>
      entry.type === OverwriteType.Member && entry.id === member.user.id,
  );
  if (personal) {
    permissions =
      (permissions & ~BigInt(personal.deny)) | BigInt(personal.allow);
  }
  // Announcement cards include rich embeds.
  const required =
    PermissionFlagsBits.ViewChannel |
    PermissionFlagsBits.SendMessages |
    PermissionFlagsBits.EmbedLinks;
  return (permissions & required) === required;
}
