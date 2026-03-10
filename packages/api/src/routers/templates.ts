import type { TRPCRouterRecord } from "@trpc/server";
import { permProcedure } from "../trpc";
import { permissions } from "@forge/utils";

export const templatesRouter = {
  createTemplate: permProcedure.mutation(({ ctx }) => {
    permissions.controlPerms.or(["EDIT_ISSUE_TEMPLATES"], ctx);

    return null;
  }),
  updateTemplate: permProcedure.mutation(({ ctx }) => {
    permissions.controlPerms.or(["EDIT_ISSUE_TEMPLATES"], ctx);

    return null;
  }),
  deleteTemplate: permProcedure.mutation(({ ctx }) => {
    permissions.controlPerms.or(["EDIT_ISSUE_TEMPLATES"], ctx);

    return null;
  }),
  getTemplates: permProcedure.query(({ ctx }) => {
    permissions.controlPerms.or(["READ_ISSUE_TEMPLATES"], ctx);

    return null;
  }),
} satisfies TRPCRouterRecord;
