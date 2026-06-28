import type { TRPCRouterRecord } from "@trpc/server";

import { permissions } from "@forge/utils";
import { permissionExpressionSchema } from "@forge/validators";

import { permProcedure, protectedProcedure } from "../trpc";
import { loadPermissionsForUser } from "../utils/permissions-db";

export const rolesRouter = {
  getPermissions: protectedProcedure.query(async ({ ctx }) =>
    loadPermissionsForUser(ctx.session.user.id),
  ),

  hasPermission: permProcedure
    .input(permissionExpressionSchema)
    .query(({ ctx, input }) => {
      try {
        if ("or" in input && input.or) {
          permissions.controlPerms.or(input.or, ctx);
        } else if ("and" in input) {
          permissions.controlPerms.and(input.and, ctx);
        }
        return true;
      } catch {
        return false;
      }
    }),
} satisfies TRPCRouterRecord;
