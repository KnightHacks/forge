import { z } from "zod";

import { PERMISSIONS } from "@forge/consts";

const permissionKeys = Object.keys(PERMISSIONS.PERMISSION_DATA) as [
  PERMISSIONS.PermissionKey,
  ...PERMISSIONS.PermissionKey[],
];

export const permissionKeySchema = z.enum(permissionKeys);

export const permissionExpressionSchema = z.union([
  z.object({
    and: z.array(permissionKeySchema).min(1),
    or: z.never().optional(),
  }),
  z.object({
    and: z.never().optional(),
    or: z.array(permissionKeySchema).min(1),
  }),
]);

export type PermissionExpression = z.infer<typeof permissionExpressionSchema>;
