import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { ISSUE } from "@forge/consts";
import { and, eq, exists, inArray, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions } from "@forge/db/schemas/auth";
import {
  InsertTemplateSchema,
  Issue,
  IssueSchema,
  IssuesToTeamsVisibility,
  IssuesToUsersAssignment,
  Template,
} from "@forge/db/schemas/knight-hacks";
import { permissions } from "@forge/utils";

import { permProcedure } from "../trpc";

const CreateIssueInputSchema = IssueSchema.extend({
  assigneeIds: z.array(z.string().uuid()).optional(),
  teamVisibilityIds: z.array(z.string().uuid()).optional(),
});

const baseSubIssueCreateSchema = IssueSchema.omit({
  creator: true,
  parent: true,
}).extend({
  assigneeIds: z.array(z.string().uuid()).optional(),
  teamVisibilityIds: z.array(z.string().uuid()).optional(),
});

type SubIssueCreateNode = z.infer<typeof baseSubIssueCreateSchema> & {
  children?: SubIssueCreateNode[];
};

const subIssueCreateSchema: z.ZodType<SubIssueCreateNode> =
  baseSubIssueCreateSchema.extend({
    children: z.lazy(() => z.array(subIssueCreateSchema)).optional(),
  });

async function createChildIssues(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  children: SubIssueCreateNode[],
  parentId: string,
  creatorId: string,
) {
  for (const child of children) {
    const { children: grandchildren, assigneeIds, teamVisibilityIds, ...rest } =
      child;
    const [created] = await tx
      .insert(Issue)
      .values({ ...rest, parent: parentId, creator: creatorId })
      .returning();
    if (!created) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create sub-issue.",
      });
    }
    if (teamVisibilityIds?.length) {
      await tx.insert(IssuesToTeamsVisibility).values(
        teamVisibilityIds.map((teamId) => ({
          issueId: created.id,
          teamId,
        })),
      );
    }
    if (assigneeIds?.length) {
      await tx.insert(IssuesToUsersAssignment).values(
        assigneeIds.map((userId) => ({
          issueId: created.id,
          userId,
        })),
      );
    }
    if (grandchildren?.length) {
      await createChildIssues(tx, grandchildren, created.id, creatorId);
    }
  }
}

async function requireIssue(id: string, label = "Issue") {
  const issue = await db.query.Issue.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  });
  if (!issue)
    throw new TRPCError({ message: `${label} not found.`, code: "NOT_FOUND" });
  return issue;
}

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

export const issuesRouter = {
  createIssue: permProcedure
    .input(
      CreateIssueInputSchema.omit({ creator: true }).extend({
        subIssues: z.array(subIssueCreateSchema).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      permissions.controlPerms.or(["EDIT_ISSUES"], ctx);

      return await db.transaction(async (tx) => {
        const { teamVisibilityIds, assigneeIds, subIssues, ...rest } = input;

        const [issue] = await tx
          .insert(Issue)
          .values({
            ...rest,
            creator: ctx.session.user.id,
          })
          .returning();

        if (!issue) {
          throw new TRPCError({
            message: "Failed to create issue.",
            code: "INTERNAL_SERVER_ERROR",
          });
        }

        if (teamVisibilityIds?.length) {
          await tx.insert(IssuesToTeamsVisibility).values(
            teamVisibilityIds.map((teamId) => ({
              issueId: issue.id,
              teamId,
            })),
          );
        }

        if (assigneeIds?.length) {
          await tx.insert(IssuesToUsersAssignment).values(
            assigneeIds.map((userId) => ({
              issueId: issue.id,
              userId,
            })),
          );
        }

        if (subIssues?.length) {
          await createChildIssues(tx, subIssues, issue.id, ctx.session.user.id);
        }

        return issue;
      });
    }),

  getIssue: permProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      permissions.controlPerms.or(["READ_ISSUES"], ctx);

      let visibilityFilter;

      if (ctx.session.permissions.IS_OFFICER) {
        visibilityFilter = sql`TRUE`;
      } else {
        const userRoles = (
          await db.query.Permissions.findMany({
            where: eq(Permissions.userId, ctx.session.user.id),
          })
        ).map((p) => p.roleId);
        visibilityFilter =
          userRoles.length === 0
            ? sql`FALSE`
            : exists(
                db
                  .select()
                  .from(IssuesToTeamsVisibility)
                  .where(
                    and(
                      eq(IssuesToTeamsVisibility.issueId, Issue.id),
                      inArray(IssuesToTeamsVisibility.teamId, userRoles),
                    ),
                  ),
              );
      }
      const issue = await db.query.Issue.findFirst({
        where: and(eq(Issue.id, input.id), visibilityFilter),
        with: {
          team: true,
          teamVisibility: { with: { team: true } },
          userAssignments: { with: { user: true } },
        },
      });
      if (!issue)
        throw new TRPCError({ message: `Issue not found.`, code: "NOT_FOUND" });
      return issue;
    }),

  getAllIssues: permProcedure
    .input(
      z
        .object({
          dateFrom: z.date().optional(),
          dateTo: z.date().optional(),
          assigneeIds: z.array(z.string().uuid()).optional(),
          creatorId: z.string().uuid().optional(),
          teamId: z.string().uuid().optional(),
          status: z.enum(ISSUE.ISSUE_STATUS).optional(),
          parentId: z.string().uuid().nullable().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      permissions.controlPerms.or(["READ_ISSUES"], ctx);

      const filters: ReturnType<typeof eq>[] = [];

      if (input?.creatorId) filters.push(eq(Issue.creator, input.creatorId));
      if (input?.teamId) filters.push(eq(Issue.team, input.teamId));
      if (input?.status) filters.push(eq(Issue.status, input.status));
      if (input?.dateFrom)
        filters.push(sql`${Issue.date} >= ${input.dateFrom}`);
      if (input?.dateTo) filters.push(sql`${Issue.date} <= ${input.dateTo}`);
      if (input?.parentId !== undefined) {
        filters.push(
          input.parentId === null
            ? sql`${Issue.parent} IS NULL`
            : eq(Issue.parent, input.parentId),
        );
      }

      let visibilityFilter;

      if (ctx.session.permissions.IS_OFFICER) {
        visibilityFilter = sql`TRUE`;
      } else {
        const userRoles = (
          await db.query.Permissions.findMany({
            where: eq(Permissions.userId, ctx.session.user.id),
          })
        ).map((p) => p.roleId);
        visibilityFilter =
          userRoles.length === 0
            ? sql`FALSE`
            : exists(
                db
                  .select()
                  .from(IssuesToTeamsVisibility)
                  .where(
                    and(
                      eq(IssuesToTeamsVisibility.issueId, Issue.id),
                      inArray(IssuesToTeamsVisibility.teamId, userRoles),
                    ),
                  ),
              );
      }

      if (input?.assigneeIds?.length) {
        filters.push(
          exists(
            db
              .select()
              .from(IssuesToUsersAssignment)
              .where(
                and(
                  eq(IssuesToUsersAssignment.issueId, Issue.id),
                  inArray(IssuesToUsersAssignment.userId, input.assigneeIds),
                ),
              ),
          ),
        );
      }

      const issues = await db.query.Issue.findMany({
        where: and(...filters, visibilityFilter),
        with: {
          teamVisibility: { with: { team: true } },
          userAssignments: { with: { user: true } },
        },
      });
      return issues;
    }),

  updateIssue: permProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        status: z.enum(ISSUE.ISSUE_STATUS).optional(),
        priority: z.enum(ISSUE.PRIORITY).optional(),
        parent: z.string().uuid().nullable().optional(),
        date: z.date().nullable().optional(),
        event: z.string().uuid().nullable().optional(),
        links: z.array(z.string().url()).nullable().optional(),
        team: z.string().uuid().optional(),
        assigneeIds: z.array(z.string().uuid()).optional(),
        teamVisibilityIds: z.array(z.string().uuid()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      permissions.controlPerms.or(["EDIT_ISSUES"], ctx);
      await requireIssue(input.id);

      const { id, assigneeIds, teamVisibilityIds, ...fields } = input;
      const updateData = Object.fromEntries(
        (Object.entries(fields) as [string, unknown][]).filter(
          ([, v]) => v !== undefined,
        ),
      );

      if (Object.keys(updateData).length > 0) {
        await db.update(Issue).set(updateData).where(eq(Issue.id, id));
      }

      if (teamVisibilityIds !== undefined) {
        await db
          .delete(IssuesToTeamsVisibility)
          .where(eq(IssuesToTeamsVisibility.issueId, id));
        if (teamVisibilityIds.length > 0) {
          await db
            .insert(IssuesToTeamsVisibility)
            .values(
              teamVisibilityIds.map((teamId) => ({ issueId: id, teamId })),
            );
        }
      }

      if (assigneeIds !== undefined) {
        await db
          .delete(IssuesToUsersAssignment)
          .where(eq(IssuesToUsersAssignment.issueId, id));
        if (assigneeIds.length > 0) {
          await db
            .insert(IssuesToUsersAssignment)
            .values(assigneeIds.map((userId) => ({ issueId: id, userId })));
        }
      }

      return db.query.Issue.findFirst({
        where: (t, { eq }) => eq(t.id, id),
        with: {
          teamVisibility: { with: { team: true } },
          userAssignments: { with: { user: true } },
        },
      });
    }),
  deleteIssue: permProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      permissions.controlPerms.or(["EDIT_ISSUES"], ctx);
      await requireIssue(input.id);

      await db.delete(Issue).where(eq(Issue.id, input.id));

      return { success: true };
    }),
  createTemplate: permProcedure
    .input(
      InsertTemplateSchema.extend({
        name: z.string().min(1, "A template name is required"), // excludes empty strings
        body: z.array(templateSubIssueSchema),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      permissions.controlPerms.or(["EDIT_ISSUE_TEMPLATES"], ctx);

      const [newTemplate] = await db.insert(Template).values(input).returning();

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
      InsertTemplateSchema.omit({
        createdAt: true,
        updatedAt: true,
      })
        .partial() // makes all future fields optional
        .extend({
          id: z.string().uuid(), // forces ID to not be an optional field
          name: z.string().min(1, "A template name is required").optional(), // excludes empty strings
          body: z.array(templateSubIssueSchema).optional(),
        }),
    )
    .mutation(async ({ ctx, input }) => {
      permissions.controlPerms.or(["EDIT_ISSUE_TEMPLATES"], ctx);

      // We want to separate id from all optional fields
      const { id, ...updateData } = input;

      // this is true only if all fields of updateData are undefined
      const hasUpdates = Object.values(updateData).some(
        // value is unknown because it seems like ts can't resolve that value might be undefined
        // and gives a type error thinking it can never overlap with undefined
        (value: unknown) => value !== undefined,
      );

      if (!hasUpdates) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You must provide at least one field to update.",
        });
      }

      const [updatedTemplate] = await db
        .update(Template)
        .set(updateData)
        .where(eq(Template.id, id))
        .returning();

      if (updatedTemplate === undefined) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Template with ID ${id} was not found`,
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
