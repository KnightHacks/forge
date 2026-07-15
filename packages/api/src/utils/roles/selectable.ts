export function isSelectableProductRole(role: {
  discordRoleId: string;
  name: string;
}) {
  return !`${role.name} ${role.discordRoleId}`.toLowerCase().includes("e2e");
}
