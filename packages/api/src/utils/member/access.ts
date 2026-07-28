import { permissions } from "@forge/utils";

/**
 * Access rules for the member domain.
 *
 * Forge checks access at two tiers. Both already existed in the code; this is
 * the first place either has been named.
 *
 * **capability** — a union across all of a user's roles, gating whether a route
 * or nav destination is reachable at all. `permissions.controlPerms.or` and
 * `.and` implement this tier, and nearly every gated procedure in the API uses
 * it. Every `require*` / `assertCan*` function in a `utils/<domain>/access.ts`
 * file is a capability check.
 *
 * **scope** — an exact match against the role that granted the permission,
 * gating which rows are readable or editable. Only two domains have one:
 * `issues` (`issueAccessForRoles`, which matches the role owning the issue) and
 * `forms` (`evaluateFormSectionAccess`, which intersects the user's role IDs
 * against a section's editor and viewer lists).
 *
 * The member domain is capability-only. Clearing a gate below grants access to
 * every member row, not a subset.
 */

type PermissionContext = Parameters<typeof permissions.controlPerms.or>[1];

const readMemberPermissions = ["READ_MEMBERS", "EDIT_MEMBERS"] as const;
const editMemberPermissions = ["EDIT_MEMBERS"] as const;

export function assertCanReadMembers(ctx: PermissionContext) {
  permissions.controlPerms.or(readMemberPermissions, ctx);
}

export function assertCanEditMembers(ctx: PermissionContext) {
  permissions.controlPerms.or(editMemberPermissions, ctx);
}

export function assertCanInvalidateMemberDues(ctx: PermissionContext) {
  permissions.controlPerms.or(["IS_OFFICER"], ctx);
}
