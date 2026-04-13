import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { ISSUE } from "@forge/consts";
import { and, eq, exists, inArray, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, User } from "@forge/db/schemas/auth";
import {
  InsertTemplateSchema,
  Issue,
  IssueSchema,
  IssuesToTeamsVisibility,
  IssuesToUsersAssignment,
  Template,
} from "@forge/db/schemas/knight-hacks";
import { permissions } from "@forge/utils";
import * as permissionsServer from "@forge/utils/permissions.server";

import { permProcedure } from "../trpc";

const CreateIssueInputSchema = IssueSchema.extend({
  assigneeIds: z.array(z.string().uuid()).optional(),
  teamVisibilityIds: z.array(z.string().uuid()).optional(),
});

const baseIssueCreateSchema = IssueSchema.omit({
  creator: true,
  parent: true,
}).extend({
  assigneeIds: z.array(z.string().uuid()).optional(),
  teamVisibilityIds: z.array(z.string().uuid()).optional(),
});

type IssueCreateNode = z.infer<typeof baseIssueCreateSchema> & {
  children?: IssueCreateNode[];
};

const issueCreateSchema: z.ZodType<IssueCreateNode> =
  baseIssueCreateSchema.extend({
    children: z.lazy(() => z.array(issueCreateSchema)).optional(),
  });

async function createChildIssues(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  children: IssueCreateNode[],
  parentId: string,
  creatorId: string,
) {
  for (const child of children) {
    const {
      children: grandchildren,
      assigneeIds,
      teamVisibilityIds,
      ...rest
    } = child;
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

async function collectIssueSubtreeIds(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  rootId: string,
) {
  const allIds = [rootId];
  let frontier = [rootId];

  while (frontier.length > 0) {
    const children = await tx
      .select({ id: Issue.id })
      .from(Issue)
      .where(inArray(Issue.parent, frontier));

    if (children.length === 0) break;

    frontier = children.map((child) => child.id);
    allIds.push(...frontier);
  }

  return allIds;
}

const baseIssueTemplateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  team: z.string().optional(),
  assignee: z.string().optional(),
  dateMs: z.number().int().optional(),
});

export type IssueTemplate = z.infer<typeof baseIssueTemplateSchema> & {
  children?: IssueTemplate[];
};

const issueTemplateSchema: z.ZodType<IssueTemplate> =
  baseIssueTemplateSchema.extend({
    children: z.lazy(() => z.array(issueTemplateSchema)).optional(),
  });

export const issuesRouter = {
  getUsersOnTeam: permProcedure
    .input(
      z.object({
        teamId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      permissions.controlPerms.or(["EDIT_ISSUES"], ctx);

      const rows = await db
        .select({
          id: User.id,
          name: User.name,
          email: User.email,
          discordUserId: User.discordUserId,
        })
        .from(User)
        .innerJoin(Permissions, eq(User.id, Permissions.userId))
        .where(eq(Permissions.roleId, input.teamId));

      const userById = new Map<
        string,
        {
          id: string;
          name: string;
          email: string | null;
        }
      >();

      for (const row of rows) {
        userById.set(row.id, {
          id: row.id,
          name: row.name ?? row.email ?? row.discordUserId,
          email: row.email,
        });
      }

      return [...userById.values()].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    }),

  createIssue: permProcedure
    .input(
      CreateIssueInputSchema.omit({ creator: true }).extend({
        children: z.array(issueCreateSchema).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      permissions.controlPerms.or(["EDIT_ISSUES"], ctx);

      return await db.transaction(async (tx) => {
        const { teamVisibilityIds, assigneeIds, children, ...rest } = input;

        await permissionsServer.validateAssigneesBelongToTeam(
          tx,
          input.team,
          assigneeIds,
        );
        if (children?.length) {
          await permissionsServer.validateIssueNodeAssignees(tx, children);
        }

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

        if (children?.length) {
          await createChildIssues(tx, children, issue.id, ctx.session.user.id);
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
      return await db.transaction(async (tx) => {
        const existingIssue = await tx.query.Issue.findFirst({
          where: (t, { eq }) => eq(t.id, input.id),
          with: {
            userAssignments: true,
          },
        });

        if (!existingIssue) {
          throw new TRPCError({
            message: "Issue not found.",
            code: "NOT_FOUND",
          });
        }

        const assignmentTeamId = input.team ?? existingIssue.team;
        const existingAssigneeIds = existingIssue.userAssignments.map(
          (assignment) => assignment.userId,
        );
        const assigneeIdsToValidate =
          input.assigneeIds ??
          (input.team !== undefined && input.team !== existingIssue.team
            ? existingAssigneeIds
            : undefined);

        await permissionsServer.validateAssigneesBelongToTeam(
          tx,
          assignmentTeamId,
          assigneeIdsToValidate,
        );

        const { id, assigneeIds, teamVisibilityIds, ...fields } = input;
        const updateData = Object.fromEntries(
          (Object.entries(fields) as [string, unknown][]).filter(
            ([, v]) => v !== undefined,
          ),
        );

        if (Object.keys(updateData).length > 0) {
          await tx.update(Issue).set(updateData).where(eq(Issue.id, id));
        }

        if (teamVisibilityIds !== undefined) {
          await tx
            .delete(IssuesToTeamsVisibility)
            .where(eq(IssuesToTeamsVisibility.issueId, id));
          if (teamVisibilityIds.length > 0) {
            await tx
              .insert(IssuesToTeamsVisibility)
              .values(
                teamVisibilityIds.map((teamId) => ({ issueId: id, teamId })),
              );
          }
        }

        if (assigneeIds !== undefined) {
          await tx
            .delete(IssuesToUsersAssignment)
            .where(eq(IssuesToUsersAssignment.issueId, id));
          if (assigneeIds.length > 0) {
            await tx
              .insert(IssuesToUsersAssignment)
              .values(assigneeIds.map((userId) => ({ issueId: id, userId })));
          }
        }

        if (
          Object.keys(updateData).length === 0 &&
          (teamVisibilityIds !== undefined || assigneeIds !== undefined)
        ) {
          await tx
            .update(Issue)
            .set({ updatedAt: new Date() })
            .where(eq(Issue.id, id));
        }

        return tx.query.Issue.findFirst({
          where: (t, { eq }) => eq(t.id, id),
          with: {
            teamVisibility: { with: { team: true } },
            userAssignments: { with: { user: true } },
          },
        });
      });
    }),
  deleteIssue: permProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      permissions.controlPerms.or(["EDIT_ISSUES"], ctx);
      await requireIssue(input.id);

      await db.transaction(async (tx) => {
        const issueIds = await collectIssueSubtreeIds(tx, input.id);
        await tx.delete(Issue).where(inArray(Issue.id, issueIds));
      });

      return { success: true };
    }),
  createTemplate: permProcedure
    .input(
      InsertTemplateSchema.extend({
        name: z.string().min(1, "A template name is required"), // excludes empty strings
        body: z.array(issueTemplateSchema),
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
          body: z.array(issueTemplateSchema).optional(),
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
