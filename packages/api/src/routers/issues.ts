import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { ISSUE } from "@forge/consts";
import { and, eq, exists, inArray, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions } from "@forge/db/schemas/auth";
import {
  Issue,
  IssueSchema,
  IssuesToTeamsVisibility,
  IssuesToUsersAssignment,
} from "@forge/db/schemas/knight-hacks";
import { permissions } from "@forge/utils";

import { permProcedure } from "../trpc";

const CreateIssueInputSchema = IssueSchema.extend({
  assigneeIds: z.array(z.string().uuid()).optional(),
  teamVisibilityIds: z.array(z.string().uuid()).optional(),
});

async function requireIssue(id: string, label = "Issue") {
  const issue = await db.query.Issue.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  });
  if (!issue)
    throw new TRPCError({ message: `${label} not found.`, code: "NOT_FOUND" });
  return issue;
}

export const issuesRouter = {
  createIssue: permProcedure
    .input(CreateIssueInputSchema.omit({ creator: true }))
    .mutation(async ({ ctx, input }) => {
      permissions.controlPerms.or(["EDIT_ISSUES"], ctx);

      return await db.transaction(async (tx) => {
        const { teamVisibilityIds, assigneeIds, ...rest } = input;

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
          await db.insert(IssuesToTeamsVisibility).values(
            teamVisibilityIds.map((teamId) => ({
              issueId: issue.id,
              teamId,
            })),
          );
        }

        if (assigneeIds?.length) {
          await db.insert(IssuesToUsersAssignment).values(
            assigneeIds.map((userId) => ({
              issueId: issue.id,
              userId,
            })),
          );
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
} satisfies TRPCRouterRecord;
