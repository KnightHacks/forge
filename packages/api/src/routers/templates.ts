import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import z from "zod";

import { eq } from "@forge/db";
import { db } from "@forge/db/client";
import { Template } from "@forge/db/schemas/knight-hacks";
import { permissions } from "@forge/utils";

import { permProcedure } from "../trpc";

const baseTemplateSubIssueSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  team: z.string().optional(),
  assignee: z.string().optional(),
  dateMs: z.number().int().optional(),
});

export type TemplateSubIssue = z.infer<typeof baseTemplateSubIssueSchema> & {
  children?: TemplateSubIssue[];
};

const templateSubIssueSchema: z.ZodType<TemplateSubIssue> =
  baseTemplateSubIssueSchema.extend({
    children: z.lazy(() => z.array(templateSubIssueSchema)).optional(),
  });

export const templatesRouter = {
  createTemplate: permProcedure
    .input(
      z.object({
        name: z.string().min(1, "A template name is required"),
        body: z.array(templateSubIssueSchema),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      permissions.controlPerms.or(["EDIT_ISSUE_TEMPLATES"], ctx);

      const [newTemplate] = await db
        .insert(Template)
        .values({
          name: input.name,
          body: input.body,
        })
        .returning();

      if (newTemplate === undefined) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `There was an error creating the template: ${input.name}`,
        });
      }

      return newTemplate;
    }),
  updateTemplate: permProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1, "Template Name cannot be empty").optional(),
        body: z.array(templateSubIssueSchema).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      permissions.controlPerms.or(["EDIT_ISSUE_TEMPLATES"], ctx);

      if (input.name === undefined && input.body === undefined) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You must provide either a name or a body to update.",
        });
      }

      const [updatedTemplate] = await db
        .update(Template)
        .set({
          ...(input.name ? { name: input.name } : {}),
          ...(input.body ? { body: input.body } : {}),
        })
        .where(eq(Template.id, input.id))
        .returning();

      if (updatedTemplate === undefined) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Template with ID ${input.id} was not found`,
        });
      }

      return updatedTemplate;
    }),
  deleteTemplate: permProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      permissions.controlPerms.or(["EDIT_ISSUE_TEMPLATES"], ctx);

      const [deleted] = await db
        .delete(Template)
        .where(eq(Template.id, input.id))
        .returning();

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Template with ID ${input.id} was not found`,
        });
      }

      return { deletedId: deleted.id };
    }),
  getTemplates: permProcedure.query(async ({ ctx }) => {
    permissions.controlPerms.or(
      ["READ_ISSUE_TEMPLATES", "EDIT_ISSUE_TEMPLATES"],
      ctx,
    );

    const templates = await db.query.Template.findMany({
      orderBy: (templates, { desc }) => [desc(templates.createdAt)],
    });

    return templates;
  }),
} satisfies TRPCRouterRecord;
