import type { TRPCRouterRecord } from "@trpc/server";
import z from "zod";

import { eq } from "@forge/db";
import { db } from "@forge/db/client";
import { Template } from "@forge/db/schemas/knight-hacks";
import { permissions } from "@forge/utils";

import { permProcedure } from "../trpc";

export const templatesRouter = {
  createTemplate: permProcedure.mutation(({ ctx }) => {
    permissions.controlPerms.or(["EDIT_ISSUE_TEMPLATES"], ctx);

    return null;
  }),
  updateTemplate: permProcedure.mutation(({ ctx }) => {
    permissions.controlPerms.or(["EDIT_ISSUE_TEMPLATES"], ctx);

    return null;
  }),
  deleteTemplate: permProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      permissions.controlPerms.or(["EDIT_ISSUE_TEMPLATES"], ctx);

      await db.delete(Template).where(eq(Template.id, input.id));
    }),
  getTemplates: permProcedure.query(async ({ ctx }) => {
    permissions.controlPerms.or(["READ_ISSUE_TEMPLATES"], ctx);

    const templates = await db.query.Template.findMany({
      orderBy: (templates, { desc }) => [desc(templates.createdAt)],
    });

    return templates;
  }),
} satisfies TRPCRouterRecord;
