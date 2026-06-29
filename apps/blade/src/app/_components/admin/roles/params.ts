import type { RoleManagementInput } from "@forge/validators";
import {
  permissionKeySchema,
  roleManagementQuerySchema,
  roleManagementTypeSchema,
  roleUuidSchema,
} from "@forge/validators";

export type RoleManagementSearchParams = Record<
  string,
  string | string[] | undefined
>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function list(value: string | string[] | undefined) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function validList<T>(
  values: string | string[] | undefined,
  parse: (value: string) => T | null,
) {
  return list(values).flatMap((value) => {
    const parsed = parse(value);
    return parsed == null ? [] : [parsed];
  });
}

export function parseRoleManagementSearchParams(
  params: RoleManagementSearchParams,
) {
  const defaults = roleManagementQuerySchema.parse({});
  const role = roleUuidSchema.safeParse(first(params.role));
  const raw = {
    page: Number(first(params.page) ?? 1),
    pageSize: Number(first(params.pageSize) ?? 25),
    permissionKeys: validList(params.permission, (value) => {
      const result = permissionKeySchema.safeParse(value);
      return result.success ? result.data : null;
    }),
    role: role.success ? role.data : undefined,
    roleQuery: first(params.roleQuery) ?? "",
    roleTypes: validList(params.roleType, (value) => {
      const result = roleManagementTypeSchema.safeParse(value);
      return result.success ? result.data : null;
    }),
    userQuery: first(params.userQuery) ?? "",
    userRoleIds: validList(params.userRole, (value) => {
      const result = roleUuidSchema.safeParse(value);
      return result.success ? result.data : null;
    }),
    view: first(params.view) ?? "roles",
  };
  const parsed = roleManagementQuerySchema.safeParse(raw);
  const result = parsed.success ? parsed.data : defaults;
  return { ...result, role: result.role };
}

export function buildRoleManagementSearchParams(input: RoleManagementInput) {
  const params = new URLSearchParams();
  if (input.view !== "roles") params.set("view", input.view);
  if (input.role) params.set("role", input.role);
  if (input.roleQuery) params.set("roleQuery", input.roleQuery);
  if (input.userQuery) params.set("userQuery", input.userQuery);
  if (input.page !== 1) params.set("page", String(input.page));
  if (input.pageSize !== 25) params.set("pageSize", String(input.pageSize));

  const appendSorted = (key: string, values: readonly string[]) => {
    for (const value of [...values].sort()) params.append(key, value);
  };
  appendSorted("permission", input.permissionKeys);
  appendSorted("roleType", input.roleTypes);
  appendSorted("userRole", input.userRoleIds);

  return params;
}
