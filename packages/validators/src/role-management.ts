import { z } from "zod";

import { permissionKeySchema } from "./permissions";

export const ROLE_UNLINK_CONFIRMATION = "I am absolutely sure";
export const roleManagementPageSizes = [25, 50, 100, 250, 500] as const;
export const roleManagementViews = ["roles", "assignments"] as const;
export const roleManagementTypes = ["access", "cosmetic", "missing"] as const;
export const roleManagementViewSchema = z.enum(roleManagementViews);
export const roleManagementTypeSchema = z.enum(roleManagementTypes);
export const roleUuidSchema = z.string().uuid();

export const discordRoleIdSchema = z
  .string()
  .trim()
  .regex(/^\d{17,20}$/, "Enter a valid Discord role ID.");

const uniquePermissionArraySchema = z
  .array(permissionKeySchema)
  .max(64)
  .superRefine((values, ctx) => {
    if (new Set(values).size !== values.length) {
      ctx.addIssue({
        code: "custom",
        message: "Permissions must not contain duplicates.",
      });
    }
  });

export const roleIdSchema = z.object({ roleId: roleUuidSchema }).strict();

export const roleCreateSchema = z
  .object({
    discordRoleId: discordRoleIdSchema,
    permissions: uniquePermissionArraySchema,
  })
  .strict();

export const rolePermissionUpdateSchema = roleIdSchema.extend({
  permissions: uniquePermissionArraySchema,
});

export const roleUnlinkSchema = roleIdSchema.extend({
  confirmation: z.literal(ROLE_UNLINK_CONFIRMATION),
});

export const roleManagementQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z
    .union([
      z.literal(25),
      z.literal(50),
      z.literal(100),
      z.literal(250),
      z.literal(500),
    ])
    .default(25),
  permissionKeys: z.array(permissionKeySchema).default([]),
  role: roleUuidSchema.optional(),
  roleQuery: z.string().trim().max(100).default(""),
  roleTypes: z.array(roleManagementTypeSchema).default([]),
  userQuery: z.string().trim().max(100).default(""),
  userRoleIds: z.array(roleUuidSchema).default([]),
  view: roleManagementViewSchema.default("roles"),
});

const uniqueUuidArray = z
  .array(roleUuidSchema)
  .min(1)
  .max(500)
  .superRefine((values, ctx) => {
    if (new Set(values).size !== values.length) {
      ctx.addIssue({
        code: "custom",
        message: "IDs must not contain duplicates.",
      });
    }
  });

export const roleBatchAssignmentSchema = z
  .object({
    action: z.enum(["grant", "revoke"]),
    roleIds: uniqueUuidArray,
    userIds: uniqueUuidArray,
  })
  .strict()
  .superRefine((input, ctx) => {
    if (input.roleIds.length * input.userIds.length > 1000) {
      ctx.addIssue({
        code: "custom",
        message: "A batch may contain at most 1,000 user-role pairs.",
        path: ["userIds"],
      });
    }
  });

export type RoleBatchAssignmentInput = z.infer<
  typeof roleBatchAssignmentSchema
>;
export type RoleManagementInput = z.infer<typeof roleManagementQuerySchema>;
export type RoleManagementPageSize = (typeof roleManagementPageSizes)[number];
export type RoleManagementType = (typeof roleManagementTypes)[number];
export type RoleManagementView = (typeof roleManagementViews)[number];
