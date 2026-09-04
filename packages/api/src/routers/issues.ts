import { randomUUID } from "node:crypto";
import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  or,
  sql,
} from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles, User } from "@forge/db/schemas/auth";
import {
  Event,
  Issue,
  IssueAttachment,
  IssueAttachmentReference,
  IssueHistory,
  IssuesToTeamsVisibility,
  IssuesToUsersAssignment,
  Member,
  Template,
} from "@forge/db/schemas/knight-hacks";
import {
  issueCreateSchema,
  issueIdSchema,
  issueListQuerySchema,
  issueRestoreSchema,
  issueRevisionSchema,
  issueTemplateCreateSchema,
  issueUpdateSchema,
} from "@forge/validators";

import type { AssignedIssueRole } from "../utils/issues/access";
import { env } from "../env";
import { permProcedure } from "../trpc";
import { createAdminAuditEvent } from "../utils/audit/service";
import {
  classifyIssueAttachmentAccess,
  issueAcceptsEdits,
  issueAccessForRoles,
  roleHasIssueCapability,
} from "../utils/issues/access";
import {
  assertIssueImages,
  attachDraftIssueImages,
  createIssueImageUpload,
  finalizeIssueImageUpload,
  getIssueImageDownloadUrl,
  syncIssueImageReferences,
} from "../utils/issues/attachments";
import { deliverLiveIssueCreationThread } from "../utils/issues/creation-thread";
import { issueImageIds } from "../utils/issues/images";
import {
  canonicalIssueCreationHash,
  issueHistoryChanges,
  legacyEasternWallClock,
} from "../utils/issues/lifecycle";
import { resolveMemberDisplayNamesByUserId } from "../utils/member/display-name";

type CreateNode = z.infer<typeof issueCreateSchema>["children"][number];

async function assignedRoles(userId: string): Promise<AssignedIssueRole[]> {
  return db
    .select({
      discordRoleId: Roles.discordRoleId,
      id: Roles.id,
      permissions: Roles.permissions,
    })
    .from(Roles)
    .innerJoin(Permissions, eq(Permissions.roleId, Roles.id))
    .where(eq(Permissions.userId, userId));
}

function requireIssueDiscovery(roles: readonly AssignedIssueRole[]) {
  if (
    !roleHasIssueCapability(roles, "READ_ISSUES") &&
    !roleHasIssueCapability(roles, "EDIT_ISSUES")
  ) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}

function requireTeamEdit(
  roles: readonly AssignedIssueRole[],
  owningTeamId: string,
) {
  const access = issueAccessForRoles({
    issue: { owningTeamId, visibleTeamIds: [] },
    roles,
  });
  if (!access.canEdit) throw new TRPCError({ code: "FORBIDDEN" });
}

export function roleVisibilityPredicate(roles: readonly AssignedIssueRole[]) {
  if (roles.some((role) => roleHasIssueCapability([role], "IS_OFFICER"))) {
    return sql`TRUE`;
  }
  const qualifyingRoleIds = roles
    .filter(
      (role) =>
        roleHasIssueCapability([role], "READ_ISSUES") ||
        roleHasIssueCapability([role], "EDIT_ISSUES"),
    )
    .map((role) => role.id);
  if (qualifyingRoleIds.length === 0) return sql`FALSE`;
  return or(
    inArray(Issue.team, qualifyingRoleIds),
    inArray(
      Issue.id,
      db
        .select({ issueId: IssuesToTeamsVisibility.issueId })
        .from(IssuesToTeamsVisibility)
        .where(inArray(IssuesToTeamsVisibility.teamId, qualifyingRoleIds)),
    ),
  );
}

/**
 * Match issues that have at least one assignment to `assigneeIds`.
 *
 * The relational query builder selects from `knight_hacks_issue` under the
 * alias `Issue`, so a correlated subquery comparing against `Issue.id` compiles
 * to the physical table name and Postgres rejects it with "invalid reference to
 * FROM-clause entry". Keep the outer column in the top-level predicate, where
 * the alias applies, exactly as `roleVisibilityPredicate` does.
 */
export function assigneeFilterPredicate(assigneeIds: readonly string[]) {
  return inArray(
    Issue.id,
    db
      .select({ issueId: IssuesToUsersAssignment.issueId })
      .from(IssuesToUsersAssignment)
      .where(inArray(IssuesToUsersAssignment.userId, [...assigneeIds])),
  );
}

async function issueRecord(id: string) {
  return db.query.Issue.findFirst({
    where: eq(Issue.id, id),
    with: {
      team: true,
      teamVisibility: { with: { team: true } },
      userAssignments: { with: { user: { with: { member: true } } } },
    },
  });
}

async function deliverCreationThread(
  record: NonNullable<Awaited<ReturnType<typeof issueRecord>>>,
) {
  if (record.discordThreadId) return;
  try {
    const delivery = await deliverLiveIssueCreationThread({
      assigneeDiscordUserIds: record.userAssignments.map(
        ({ user }) => user.discordUserId,
      ),
      channelId: record.team.issueReminderChannel,
      description: record.description,
      dueAt: record.dueAt,
      eventId: record.event,
      id: record.id,
      links: record.links ?? [],
      name: record.name,
      parentId: record.parent,
      priority: record.priority,
      status: record.status,
      teamColor: record.team.teamHexcodeColor,
      teamDiscordRoleId: record.team.discordRoleId,
      teamName: record.team.name,
      url: `${env.BLADE_URL.replace(/\/$/, "")}/admin/issues/${record.id}`,
    });
    if (delivery.status === "delivered") {
      await db
        .update(Issue)
        .set({ discordThreadId: delivery.threadId })
        .where(and(eq(Issue.id, record.id), isNull(Issue.discordThreadId)));
    }
  } catch (cause) {
    throw new TRPCError({
      cause,
      code: "INTERNAL_SERVER_ERROR",
      message:
        "The issue was saved, but its Discord thread could not be created. Retry issue creation to finish delivery.",
    });
  }
}

function requireRecordAccess(
  record: NonNullable<Awaited<ReturnType<typeof issueRecord>>>,
  roles: readonly AssignedIssueRole[],
  mode: "edit" | "read",
) {
  const access = issueAccessForRoles({
    issue: {
      owningTeamId: record.team.id,
      visibleTeamIds: record.teamVisibility.map((entry) => entry.teamId),
    },
    roles,
  });
  if (mode === "edit" ? !access.canEdit : !access.canRead) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Issue not found." });
  }
  return access;
}

function memberDisplayName(user: {
  discordUserId: string;
  member: { firstName: string; lastName: string } | null;
  name: string | null;
}) {
  if (user.member) {
    return `${user.member.firstName} ${user.member.lastName}`.trim();
  }
  return nonBlankDisplayName(user.name, user.discordUserId);
}

function nonBlankDisplayName(
  name: string | null | undefined,
  fallback: string,
) {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function issueDto(
  record: NonNullable<Awaited<ReturnType<typeof issueRecord>>>,
  roles: readonly AssignedIssueRole[],
) {
  const access = issueAccessForRoles({
    issue: {
      owningTeamId: record.team.id,
      visibleTeamIds: record.teamVisibility.map((entry) => entry.teamId),
    },
    roles,
  });
  return {
    archiveBatchId: record.archiveBatchId,
    archivedAt: record.archivedAt,
    assignees: record.userAssignments.map((assignment) => ({
      id: assignment.userId,
      name: memberDisplayName(assignment.user),
    })),
    canEdit: access.canEdit,
    createdAt: record.createdAt,
    description: record.description,
    dueAt: record.dueAt,
    eventId: record.event,
    id: record.id,
    links: record.links ?? [],
    name: record.name,
    parentId: record.parent,
    priority: record.priority,
    revision: record.revision,
    status: record.status,
    team: {
      color: record.team.teamHexcodeColor,
      id: record.team.id,
      name: record.team.name,
    },
    updatedAt: record.updatedAt,
    visibleTeams: record.teamVisibility.map(({ team }) => ({
      color: team.teamHexcodeColor,
      id: team.id,
      name: team.name,
    })),
  };
}

async function validateAssignees(teamId: string, userIds: readonly string[]) {
  if (userIds.length === 0) return;
  const rows = await db
    .select({ userId: Permissions.userId })
    .from(Permissions)
    .where(
      and(
        eq(Permissions.roleId, teamId),
        inArray(Permissions.userId, [...userIds]),
      ),
    );
  const eligible = new Set(rows.map((row) => row.userId));
  if (userIds.some((userId) => !eligible.has(userId))) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Every assignee must belong to the owning team.",
    });
  }
}

function audienceVisible(
  duesPaying: boolean | null,
  audienceRoleIds: string[] | null,
  callerRoleIds: Set<string>,
) {
  return (
    duesPaying === true ||
    (audienceRoleIds?.length ?? 0) === 0 ||
    audienceRoleIds?.some((id) => callerRoleIds.has(id)) === true
  );
}

function eventAvailableToRoles(
  event: typeof Event.$inferSelect,
  roles: readonly AssignedIssueRole[],
) {
  if (
    roleHasIssueCapability(roles, "READ_CLUB_EVENT") ||
    roleHasIssueCapability(roles, "EDIT_CLUB_EVENT")
  ) {
    return true;
  }
  const callerRoleIds = new Set(
    roles.flatMap((role) => (role.discordRoleId ? [role.discordRoleId] : [])),
  );
  if (event.legacy) {
    return audienceVisible(false, event.roles, callerRoleIds);
  }
  return (
    event.publishedAt !== null &&
    audienceVisible(event.dues_paying, event.roles, callerRoleIds) &&
    audienceVisible(
      event.visibilityDuesPaying,
      event.visibilityRoles,
      callerRoleIds,
    )
  );
}

async function validateClubEvent(
  eventId: string | null | undefined,
  roles: readonly AssignedIssueRole[],
) {
  if (!eventId) return;
  const event = await db.query.Event.findFirst({
    where: and(
      eq(Event.id, eventId),
      isNull(Event.hackathonId),
      isNull(Event.deletionIntentAt),
    ),
  });
  if (!event || !eventAvailableToRoles(event, roles)) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
  }
}

function flattenNodes(nodes: readonly CreateNode[]): CreateNode[] {
  return nodes.flatMap((node) => [node, ...flattenNodes(node.children ?? [])]);
}

interface TreeShape {
  children?: readonly TreeShape[];
}

function treeMetrics(node: TreeShape): { depth: number; nodeCount: number } {
  const children = node.children ?? [];
  const childMetrics = children.map(treeMetrics);
  return {
    depth:
      childMetrics.length === 0
        ? 1
        : 1 + Math.max(...childMetrics.map((child) => child.depth)),
    nodeCount:
      1 + childMetrics.reduce((total, child) => total + child.nodeCount, 0),
  };
}

async function validateCreateTree(
  rootTeam: string,
  children: readonly CreateNode[],
  roles: readonly AssignedIssueRole[],
) {
  for (const node of flattenNodes(children)) {
    if (node.team !== rootTeam) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Every issue in a hierarchy must use the owning team.",
      });
    }
    await validateAssignees(node.team, node.assigneeIds);
    await validateClubEvent(node.eventId, roles);
  }
}

async function insertIssueNode(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  node: CreateNode,
  options: {
    actorDisplayName: string;
    creationHash?: string;
    creationKey?: string;
    creatorId: string;
    imageDraft?: { draftKey: string; ownerUserId: string };
    imageReferences?: { attachmentIds: string[]; issueId: string }[];
    parentId?: string | null;
  },
) {
  const dueAt = node.dueAt ? new Date(node.dueAt) : null;
  const [created] = await tx
    .insert(Issue)
    .values({
      creationHash: options.creationHash,
      creationKey: options.creationKey,
      creator: options.creatorId,
      date: dueAt ? legacyEasternWallClock(dueAt) : null,
      description: node.description,
      dueAt,
      event: node.eventId,
      links: node.links,
      name: node.name,
      parent: options.parentId,
      priority: node.priority,
      status: node.status,
      team: node.team,
    })
    .returning();
  if (!created) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Issue creation failed.",
    });
  }
  if (options.imageDraft) {
    const attachmentIds = await assertIssueImages({
      database: tx,
      description: node.description,
      draftKey: options.imageDraft.draftKey,
      ownerUserId: options.imageDraft.ownerUserId,
      teamId: node.team,
    });
    options.imageReferences?.push({ attachmentIds, issueId: created.id });
  }

  const visibleTeamIds = [...new Set([node.team, ...node.teamVisibilityIds])];
  if (visibleTeamIds.length > 0) {
    await tx
      .insert(IssuesToTeamsVisibility)
      .values(
        visibleTeamIds.map((teamId) => ({ issueId: created.id, teamId })),
      );
  }
  if (node.assigneeIds.length > 0) {
    await tx
      .insert(IssuesToUsersAssignment)
      .values(
        node.assigneeIds.map((userId) => ({ issueId: created.id, userId })),
      );
  }
  await tx.insert(IssueHistory).values({
    action: "created",
    actorDisplayName: options.actorDisplayName,
    actorId: options.creatorId,
    after: {
      description: created.description,
      dueAt: created.dueAt?.toISOString() ?? null,
      name: created.name,
      priority: created.priority,
      status: created.status,
      team: created.team,
    },
    changedFields: [
      "name",
      "description",
      "status",
      "priority",
      "team",
      "dueAt",
    ],
    issueId: created.id,
  });

  for (const child of node.children ?? []) {
    await insertIssueNode(tx, child, {
      actorDisplayName: options.actorDisplayName,
      creatorId: options.creatorId,
      imageDraft: options.imageDraft,
      imageReferences: options.imageReferences,
      parentId: created.id,
    });
  }
  return created;
}

async function collectSubtreeIds(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  rootId: string,
) {
  const ids = [rootId];
  let frontier = [rootId];
  while (frontier.length > 0) {
    const rows = await tx
      .select({ id: Issue.id })
      .from(Issue)
      .where(inArray(Issue.parent, frontier));
    frontier = rows.map((row) => row.id).filter((id) => !ids.includes(id));
    ids.push(...frontier);
  }
  return ids;
}

function conflict(message: string): never {
  throw new TRPCError({ code: "CONFLICT", message });
}

function isUniqueViolation(error: unknown) {
  return (error as { code?: string } | null)?.code === "23505";
}

const historyQuerySchema = issueIdSchema.extend({
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(25),
});

const teamChoiceSchema = z.object({ teamId: z.string().uuid() }).strict();
const templateIdSchema = z.object({ id: z.string().uuid() }).strict();
const templateUpdateInput = z.object({
  body: z.unknown(),
  id: z.string().uuid(),
  name: z.string(),
});

export const issuesRouter = {
  createImageUpload: permProcedure
    .input(
      z.discriminatedUnion("mode", [
        z.object({
          contentType: z.string().trim().max(255),
          draftKey: z.string().uuid(),
          fileName: z.string().trim().min(1).max(255),
          mode: z.literal("draft"),
          size: z.number().int().positive(),
          teamId: z.string().uuid(),
        }),
        z.object({
          contentType: z.string().trim().max(255),
          fileName: z.string().trim().min(1).max(255),
          issueId: z.string().uuid(),
          mode: z.literal("issue"),
          size: z.number().int().positive(),
        }),
      ]),
    )
    .mutation(async ({ ctx, input }) => {
      const roles = await assignedRoles(ctx.session.user.id);
      if (input.mode === "draft") {
        requireTeamEdit(roles, input.teamId);
        return createIssueImageUpload({
          ...input,
          ownerUserId: ctx.session.user.id,
        });
      }
      const record = await issueRecord(input.issueId);
      if (!record) throw new TRPCError({ code: "NOT_FOUND" });
      requireRecordAccess(record, roles, "edit");
      if (!issueAcceptsEdits(record)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Restore the issue before editing it.",
        });
      }
      return createIssueImageUpload({
        ...input,
        ownerUserId: ctx.session.user.id,
        teamId: record.team.id,
      });
    }),

  finalizeImageUpload: permProcedure
    .input(z.object({ attachmentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const attachment = await db.query.IssueAttachment.findFirst({
        where: eq(IssueAttachment.id, input.attachmentId),
      });
      if (attachment?.ownerUserId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const roles = await assignedRoles(ctx.session.user.id);
      if (attachment.issueId) {
        const record = await issueRecord(attachment.issueId);
        if (!record) throw new TRPCError({ code: "NOT_FOUND" });
        requireRecordAccess(record, roles, "edit");
        if (!issueAcceptsEdits(record)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Restore the issue before editing it.",
          });
        }
      } else {
        requireTeamEdit(roles, attachment.teamId);
      }
      const { attachment: saved, finalizedNow } =
        await finalizeIssueImageUpload({
          attachmentId: input.attachmentId,
          ownerUserId: ctx.session.user.id,
        });
      if (finalizedNow) {
        await createAdminAuditEvent({
          actionKey: "issue.image.uploaded",
          actor: ctx.session.user,
          metadata: {
            attachmentId: saved.id,
            byteSize: saved.size,
            draft: saved.issueId === null,
            filename: saved.fileName,
            mimeType: saved.contentType,
          },
          subjects: [
            {
              relation: "primary",
              targetId: saved.id,
              targetLabel: saved.fileName,
              targetType: "attachment",
            },
            {
              relation: "secondary",
              targetId: saved.issueId ?? saved.teamId,
              targetLabel: saved.issueId ? "Issue" : "Issue draft team",
              targetType: saved.issueId ? "issue" : "role",
            },
          ],
        });
      }
      return saved;
    }),

  getImageDownload: permProcedure
    .input(z.object({ attachmentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const attachment = await db.query.IssueAttachment.findFirst({
        where: eq(IssueAttachment.id, input.attachmentId),
      });
      if (!attachment?.finalizedAt) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const references = await db
        .select({ issueId: IssueAttachmentReference.issueId })
        .from(IssueAttachmentReference)
        .where(eq(IssueAttachmentReference.attachmentId, attachment.id));
      const accessKind = classifyIssueAttachmentAccess({
        draftKey: attachment.draftKey,
        issueId: attachment.issueId,
        referenceCount: references.length,
      });
      if (accessKind === "referenced") {
        const roles = await assignedRoles(ctx.session.user.id);
        let allowed = false;
        for (const reference of references) {
          const record = await issueRecord(reference.issueId);
          if (
            !record ||
            !issueImageIds(record.description).includes(attachment.id)
          ) {
            continue;
          }
          try {
            requireRecordAccess(record, roles, "read");
            allowed = true;
            break;
          } catch (error) {
            if (!(error instanceof TRPCError)) throw error;
          }
        }
        if (!allowed) throw new TRPCError({ code: "NOT_FOUND" });
      } else if (accessKind === "issue_upload" && attachment.issueId) {
        const roles = await assignedRoles(ctx.session.user.id);
        const record = await issueRecord(attachment.issueId);
        if (!record) throw new TRPCError({ code: "NOT_FOUND" });
        requireRecordAccess(record, roles, "edit");
      } else if (accessKind === "draft_upload") {
        if (attachment.ownerUserId !== ctx.session.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
      } else {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return getIssueImageDownloadUrl(input.attachmentId);
    }),

  list: permProcedure
    .input(issueListQuerySchema)
    .query(async ({ ctx, input }) => {
      const roles = await assignedRoles(ctx.session.user.id);
      requireIssueDiscovery(roles);

      const conditions = [
        roleVisibilityPredicate(roles),
        input.archived ? isNotNull(Issue.archivedAt) : isNull(Issue.archivedAt),
      ];
      if (input.statuses.length > 0)
        conditions.push(inArray(Issue.status, input.statuses));
      if (input.priorities.length > 0)
        conditions.push(inArray(Issue.priority, input.priorities));
      if (input.teamIds.length > 0)
        conditions.push(inArray(Issue.team, input.teamIds));
      if (input.rootOnly) conditions.push(isNull(Issue.parent));
      if (input.dueAfter)
        conditions.push(gte(Issue.dueAt, new Date(input.dueAfter)));
      if (input.dueBefore)
        conditions.push(lt(Issue.dueAt, new Date(input.dueBefore)));
      if (input.eventLink === "linked") conditions.push(isNotNull(Issue.event));
      if (input.eventLink === "unlinked") conditions.push(isNull(Issue.event));
      if (input.search) {
        const search = or(
          ilike(Issue.name, `%${input.search}%`),
          ilike(Issue.description, `%${input.search}%`),
        );
        if (search) conditions.push(search);
      }
      if (input.assigneeIds.length > 0) {
        conditions.push(assigneeFilterPredicate(input.assigneeIds));
      }
      if (input.view === "calendar") {
        const { calendarEnd, calendarStart } = input;
        if (!calendarStart || !calendarEnd) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Calendar start and end are required for calendar view.",
          });
        }
        conditions.push(isNotNull(Issue.dueAt));
        conditions.push(gte(Issue.dueAt, new Date(calendarStart)));
        conditions.push(lt(Issue.dueAt, new Date(calendarEnd)));
      }
      const where = and(...conditions);
      const direction = input.sortDirection === "asc" ? asc : desc;
      const sortColumn =
        input.sortField === "name"
          ? Issue.name
          : input.sortField === "priority"
            ? Issue.priority
            : input.sortField === "status"
              ? Issue.status
              : input.sortField === "updatedAt"
                ? Issue.updatedAt
                : Issue.dueAt;
      const limit = input.pageSize;
      const offset = (input.page - 1) * input.pageSize;
      const rows = await db.query.Issue.findMany({
        limit,
        offset,
        orderBy: [direction(sortColumn), asc(Issue.id)],
        where,
        with: {
          team: true,
          teamVisibility: { with: { team: true } },
          userAssignments: { with: { user: { with: { member: true } } } },
        },
      });
      const [total] = await db
        .select({
          count: sql<number>`count(*)::int`,
          finished: sql<number>`count(*) filter (where ${Issue.status} = 'Finished')::int`,
          open: sql<number>`count(*) filter (where ${Issue.status} <> 'Finished')::int`,
        })
        .from(Issue)
        .where(where);
      return {
        counts: {
          finished: total?.finished ?? 0,
          open: total?.open ?? 0,
        },
        pagination: {
          page: input.page,
          pageCount: Math.max(
            1,
            Math.ceil((total?.count ?? 0) / input.pageSize),
          ),
          pageSize: input.pageSize,
          totalCount: total?.count ?? 0,
        },
        rows: rows.map((row) => issueDto(row, roles)),
      };
    }),

  get: permProcedure.input(issueIdSchema).query(async ({ ctx, input }) => {
    const roles = await assignedRoles(ctx.session.user.id);
    const record = await issueRecord(input.id);
    if (!record)
      throw new TRPCError({ code: "NOT_FOUND", message: "Issue not found." });
    requireRecordAccess(record, roles, "read");
    const children = await db
      .select({
        id: Issue.id,
        name: Issue.name,
        status: Issue.status,
        archivedAt: Issue.archivedAt,
      })
      .from(Issue)
      .where(eq(Issue.parent, record.id))
      .orderBy(asc(Issue.createdAt));
    return { ...issueDto(record, roles), children };
  }),

  create: permProcedure
    .input(issueCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const roles = await assignedRoles(ctx.session.user.id);
      requireTeamEdit(roles, input.team);
      await validateAssignees(input.team, input.assigneeIds);
      await validateClubEvent(input.eventId, roles);
      await validateCreateTree(input.team, input.children, roles);
      if (input.parentId) {
        const parent = await issueRecord(input.parentId);
        if (!parent || parent.archivedAt || parent.team.id !== input.team) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid parent issue.",
          });
        }
        requireRecordAccess(parent, roles, "edit");
      }
      const creationHash = canonicalIssueCreationHash(input);
      const existing = await db.query.Issue.findFirst({
        where: eq(Issue.creationKey, input.creationKey),
      });
      if (existing) {
        if (existing.creationHash !== creationHash)
          conflict(
            "Creation key was already used with different issue content.",
          );
        const record = await issueRecord(existing.id);
        if (!record) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        requireRecordAccess(record, roles, "read");
        // Discord is deliberately outside the issue transaction. The creation
        // key plus stable Discord nonces make this exact replay repairable.
        await deliverCreationThread(record);
        return { issue: issueDto(record, roles), replayed: true };
      }
      const actorDisplayName = nonBlankDisplayName(
        ctx.session.user.name,
        "Club member",
      );
      const rootNode: CreateNode = { ...input, children: input.children };
      let created: typeof Issue.$inferSelect;
      try {
        created = await db.transaction(async (tx) => {
          const imageReferences: {
            attachmentIds: string[];
            issueId: string;
          }[] = [];
          const root = await insertIssueNode(tx, rootNode, {
            actorDisplayName,
            creationHash,
            creationKey: input.creationKey,
            creatorId: ctx.session.user.id,
            imageDraft: {
              draftKey: input.creationKey,
              ownerUserId: ctx.session.user.id,
            },
            imageReferences,
            parentId: input.parentId,
          });
          await attachDraftIssueImages({
            database: tx,
            draftKey: input.creationKey,
            ownerUserId: ctx.session.user.id,
            references: imageReferences,
          });
          const createdIds = await collectSubtreeIds(tx, root.id);
          const createdRows = await tx
            .select({ id: Issue.id, name: Issue.name })
            .from(Issue)
            .where(inArray(Issue.id, createdIds));
          const metrics = treeMetrics(rootNode);
          const operationId = randomUUID();
          await createAdminAuditEvent(
            {
              actionKey: "issue.tree.created",
              actor: ctx.session.user,
              metadata: {
                assigneeIds: input.assigneeIds,
                createdCount: metrics.nodeCount,
                eventId: input.eventId ?? null,
                parentId: input.parentId ?? null,
                priority: input.priority,
                status: input.status,
                teamId: input.team,
                treeDepth: metrics.depth,
              },
              operationId,
              subjects: [
                {
                  relation: "primary",
                  targetId: operationId,
                  targetLabel: `Issue tree: ${root.name}`,
                  targetType: "issue_tree",
                },
                ...createdRows.map((issue) => ({
                  relation: "result" as const,
                  resultOutcome: "succeeded" as const,
                  targetId: issue.id,
                  targetLabel: issue.name,
                  targetType: "issue" as const,
                })),
              ],
            },
            tx,
          );
          return root;
        });
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        const raced = await db.query.Issue.findFirst({
          where: eq(Issue.creationKey, input.creationKey),
        });
        if (raced?.creationHash !== creationHash) {
          conflict(
            "Creation key was already used with different issue content.",
          );
        }
        created = raced;
      }
      const record = await issueRecord(created.id);
      if (!record) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // A Discord outage does not roll back the committed issue. Returning an
      // error preserves the client draft so the same creation key can repair
      // the idempotent thread delivery without duplicating the issue.
      await deliverCreationThread(record);
      return { issue: issueDto(record, roles), replayed: false };
    }),

  update: permProcedure
    .input(issueUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const roles = await assignedRoles(ctx.session.user.id);
      const current = await issueRecord(input.id);
      if (!current)
        throw new TRPCError({ code: "NOT_FOUND", message: "Issue not found." });
      requireRecordAccess(current, roles, "edit");
      if (!issueAcceptsEdits(current))
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Restore the issue before editing it.",
        });
      if (input.assigneeIds)
        await validateAssignees(current.team.id, input.assigneeIds);
      if (input.eventId !== undefined)
        await validateClubEvent(input.eventId, roles);
      if (input.parentId !== undefined && input.parentId !== null) {
        if (input.parentId === input.id)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "An issue cannot parent itself.",
          });
        const parent = await issueRecord(input.parentId);
        if (
          !parent ||
          parent.archivedAt ||
          parent.team.id !== current.team.id
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid parent issue.",
          });
        }
        const descendants = await db.transaction((tx) =>
          collectSubtreeIds(tx, input.id),
        );
        if (descendants.includes(input.parentId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Issue hierarchy cannot contain a cycle.",
          });
        }
      }
      const before = {
        assigneeIds: current.userAssignments.map((item) => item.userId).sort(),
        description: current.description,
        dueAt: current.dueAt,
        eventId: current.event,
        links: current.links ?? [],
        name: current.name,
        parentId: current.parent,
        priority: current.priority,
        status: current.status,
        teamVisibilityIds: current.teamVisibility
          .map((item) => item.teamId)
          .sort(),
      };
      const dueAt =
        input.dueAt === undefined
          ? undefined
          : input.dueAt
            ? new Date(input.dueAt)
            : null;
      const after = {
        ...before,
        ...input,
        ...(dueAt !== undefined && { dueAt }),
        assigneeIds: input.assigneeIds ?? before.assigneeIds,
        eventId: input.eventId === undefined ? before.eventId : input.eventId,
        parentId:
          input.parentId === undefined ? before.parentId : input.parentId,
        teamVisibilityIds: input.teamVisibilityIds ?? before.teamVisibilityIds,
      };
      const changes = issueHistoryChanges(before, after);
      if (changes.changedFields.length === 0) return issueDto(current, roles);
      await db.transaction(async (tx) => {
        let attachmentIds: string[] | undefined;
        if (input.description !== undefined) {
          attachmentIds = await assertIssueImages({
            database: tx,
            description: input.description,
            issueId: input.id,
            ownerUserId: ctx.session.user.id,
            teamId: current.team.id,
          });
        }
        const [updated] = await tx
          .update(Issue)
          .set({
            ...(input.description !== undefined && {
              description: input.description,
            }),
            ...(dueAt !== undefined && {
              date: dueAt ? legacyEasternWallClock(dueAt) : null,
              dueAt,
            }),
            ...(input.eventId !== undefined && { event: input.eventId }),
            ...(input.links !== undefined && { links: input.links }),
            ...(input.name !== undefined && { name: input.name }),
            ...(input.parentId !== undefined && { parent: input.parentId }),
            ...(input.priority !== undefined && { priority: input.priority }),
            ...(input.status !== undefined && { status: input.status }),
            revision: sql`${Issue.revision} + 1`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(Issue.id, input.id),
              eq(Issue.revision, input.expectedRevision),
            ),
          )
          .returning({ id: Issue.id });
        if (!updated)
          conflict(
            "This issue changed since you opened it. Reload the latest version.",
          );
        if (attachmentIds) {
          await syncIssueImageReferences({
            attachmentIds,
            database: tx,
            issueId: input.id,
            ownerUserId: ctx.session.user.id,
          });
        }
        if (input.assigneeIds) {
          await tx
            .delete(IssuesToUsersAssignment)
            .where(eq(IssuesToUsersAssignment.issueId, input.id));
          if (input.assigneeIds.length > 0)
            await tx.insert(IssuesToUsersAssignment).values(
              input.assigneeIds.map((userId) => ({
                issueId: input.id,
                userId,
              })),
            );
        }
        if (input.teamVisibilityIds) {
          await tx
            .delete(IssuesToTeamsVisibility)
            .where(eq(IssuesToTeamsVisibility.issueId, input.id));
          const teamIds = [
            ...new Set([current.team.id, ...input.teamVisibilityIds]),
          ];
          await tx
            .insert(IssuesToTeamsVisibility)
            .values(teamIds.map((teamId) => ({ issueId: input.id, teamId })));
        }
        await tx.insert(IssueHistory).values({
          action: changes.changedFields.includes("status")
            ? "status_changed"
            : "updated",
          actorDisplayName: nonBlankDisplayName(
            ctx.session.user.name,
            "Club member",
          ),
          actorId: ctx.session.user.id,
          after: changes.after,
          before: changes.before,
          changedFields: changes.changedFields,
          issueId: input.id,
        });
        const auditChanges = [
          {
            after: after.name,
            before: before.name,
            field: "name",
            sourceField: "name",
          },
          {
            after: after.status,
            before: before.status,
            field: "status",
            sourceField: "status",
          },
          {
            after: after.priority,
            before: before.priority,
            field: "priority",
            sourceField: "priority",
          },
          {
            after:
              after.dueAt instanceof Date
                ? after.dueAt.toISOString()
                : after.dueAt
                  ? new Date(after.dueAt).toISOString()
                  : null,
            before: before.dueAt?.toISOString() ?? null,
            field: "dueAt",
            sourceField: "dueAt",
          },
          {
            after: after.eventId,
            before: before.eventId,
            field: "eventId",
            sourceField: "eventId",
          },
          {
            after: after.parentId,
            before: before.parentId,
            field: "parentId",
            sourceField: "parentId",
          },
          {
            after: after.assigneeIds,
            before: before.assigneeIds,
            field: "assigneeIds",
            sourceField: "assigneeIds",
          },
          {
            after: after.teamVisibilityIds,
            before: before.teamVisibilityIds,
            field: "visibleTeamIds",
            sourceField: "teamVisibilityIds",
          },
        ].filter((change) =>
          changes.changedFields.includes(change.sourceField),
        );
        const statusOnly =
          changes.changedFields.length === 1 &&
          changes.changedFields[0] === "status";
        await createAdminAuditEvent(
          {
            actionKey: statusOnly ? "issue.status.changed" : "issue.updated",
            actor: ctx.session.user,
            changes: auditChanges.map(
              ({ sourceField: _sourceField, ...change }) => change,
            ),
            metadata: { revision: input.expectedRevision + 1 },
            subjects: [
              {
                relation: "primary",
                targetId: input.id,
                targetLabel: after.name,
                targetType: "issue",
              },
            ],
          },
          tx,
        );
      });
      const updated = await issueRecord(input.id);
      if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return issueDto(updated, roles);
    }),

  archive: permProcedure
    .input(issueRevisionSchema)
    .mutation(async ({ ctx, input }) => {
      const roles = await assignedRoles(ctx.session.user.id);
      const root = await issueRecord(input.id);
      if (!root)
        throw new TRPCError({ code: "NOT_FOUND", message: "Issue not found." });
      requireRecordAccess(root, roles, "edit");
      if (root.archivedAt)
        return { archiveBatchId: root.archiveBatchId, archivedCount: 0 };
      const batchId = randomUUID();
      const archivedAt = new Date();
      const ids = await db.transaction(async (tx) => {
        const subtreeIds = await collectSubtreeIds(tx, input.id);
        const activeDescendants = await tx
          .select({ id: Issue.id, name: Issue.name })
          .from(Issue)
          .where(
            and(
              inArray(
                Issue.id,
                subtreeIds.filter((id) => id !== input.id),
              ),
              isNull(Issue.archivedAt),
            ),
          );
        const archivedIds = [
          input.id,
          ...activeDescendants.map((row) => row.id),
        ];
        const [updatedRoot] = await tx
          .update(Issue)
          .set({
            archiveBatchId: batchId,
            archivedAt,
            archivedBy: ctx.session.user.id,
            revision: sql`${Issue.revision} + 1`,
            updatedAt: archivedAt,
          })
          .where(
            and(
              eq(Issue.id, input.id),
              eq(Issue.revision, input.expectedRevision),
              isNull(Issue.archivedAt),
            ),
          )
          .returning({ id: Issue.id });
        if (!updatedRoot)
          conflict(
            "This issue changed since you opened it. Reload the latest version.",
          );
        const descendants = archivedIds.filter((id) => id !== input.id);
        if (descendants.length > 0)
          await tx
            .update(Issue)
            .set({
              archiveBatchId: batchId,
              archivedAt,
              archivedBy: ctx.session.user.id,
              revision: sql`${Issue.revision} + 1`,
              updatedAt: archivedAt,
            })
            .where(
              and(inArray(Issue.id, descendants), isNull(Issue.archivedAt)),
            );
        await tx.insert(IssueHistory).values(
          archivedIds.map((issueId) => ({
            action: "archived",
            actorDisplayName: nonBlankDisplayName(
              ctx.session.user.name,
              "Club member",
            ),
            actorId: ctx.session.user.id,
            after: {
              archiveBatchId: batchId,
              archivedAt: archivedAt.toISOString(),
            },
            before: { archiveBatchId: null, archivedAt: null },
            changedFields: ["archivedAt", "archiveBatchId"],
            issueId,
          })),
        );
        await createAdminAuditEvent(
          {
            actionKey: "issue.tree.archived",
            actor: ctx.session.user,
            metadata: {
              archiveBatchId: batchId,
              archivedCount: archivedIds.length,
            },
            operationId: batchId,
            subjects: [
              {
                relation: "primary",
                targetId: batchId,
                targetLabel: `Issue tree: ${root.name}`,
                targetType: "issue_tree",
              },
              {
                relation: "result",
                resultOutcome: "succeeded",
                targetId: root.id,
                targetLabel: root.name,
                targetType: "issue",
              },
              ...activeDescendants.map((issue) => ({
                relation: "result" as const,
                resultOutcome: "succeeded" as const,
                targetId: issue.id,
                targetLabel: issue.name,
                targetType: "issue" as const,
              })),
            ],
          },
          tx,
        );
        return archivedIds;
      });
      return { archiveBatchId: batchId, archivedCount: ids.length };
    }),

  restore: permProcedure
    .input(issueRestoreSchema)
    .mutation(async ({ ctx, input }) => {
      const roles = await assignedRoles(ctx.session.user.id);
      const root = await issueRecord(input.id);
      if (!root)
        throw new TRPCError({ code: "NOT_FOUND", message: "Issue not found." });
      requireRecordAccess(root, roles, "edit");
      if (root.archiveBatchId !== input.archiveBatchId)
        conflict("This archive batch is no longer current.");
      const restoredAt = new Date();
      const restoredIds = await db.transaction(async (tx) => {
        const subtreeIds = await collectSubtreeIds(tx, input.id);
        const candidates = await tx
          .select({ id: Issue.id, name: Issue.name })
          .from(Issue)
          .where(
            and(
              inArray(Issue.id, subtreeIds),
              eq(Issue.archiveBatchId, input.archiveBatchId),
            ),
          );
        const ids = candidates.map((row) => row.id);
        const [restoredRoot] = await tx
          .update(Issue)
          .set({
            archiveBatchId: null,
            archivedAt: null,
            archivedBy: null,
            revision: sql`${Issue.revision} + 1`,
            updatedAt: restoredAt,
          })
          .where(
            and(
              eq(Issue.id, input.id),
              eq(Issue.archiveBatchId, input.archiveBatchId),
              eq(Issue.revision, input.expectedRevision),
            ),
          )
          .returning({ id: Issue.id });
        if (!restoredRoot)
          conflict(
            "This issue changed since you opened it. Reload the latest version.",
          );
        const descendants = ids.filter((id) => id !== input.id);
        if (descendants.length > 0)
          await tx
            .update(Issue)
            .set({
              archiveBatchId: null,
              archivedAt: null,
              archivedBy: null,
              revision: sql`${Issue.revision} + 1`,
              updatedAt: restoredAt,
            })
            .where(
              and(
                inArray(Issue.id, descendants),
                eq(Issue.archiveBatchId, input.archiveBatchId),
              ),
            );
        await tx.insert(IssueHistory).values(
          ids.map((issueId) => ({
            action: "restored",
            actorDisplayName: nonBlankDisplayName(
              ctx.session.user.name,
              "Club member",
            ),
            actorId: ctx.session.user.id,
            after: { archiveBatchId: null, archivedAt: null },
            before: { archiveBatchId: input.archiveBatchId },
            changedFields: ["archivedAt", "archiveBatchId"],
            issueId,
          })),
        );
        await createAdminAuditEvent(
          {
            actionKey: "issue.archive_batch.restored",
            actor: ctx.session.user,
            metadata: {
              archiveBatchId: input.archiveBatchId,
              restoredCount: ids.length,
            },
            operationId: input.archiveBatchId,
            subjects: [
              {
                relation: "primary",
                targetId: input.archiveBatchId,
                targetLabel: `Issue archive batch: ${root.name}`,
                targetType: "issue_tree",
              },
              ...candidates.map((issue) => ({
                relation: "result" as const,
                resultOutcome: "succeeded" as const,
                targetId: issue.id,
                targetLabel: issue.name,
                targetType: "issue" as const,
              })),
            ],
          },
          tx,
        );
        return ids;
      });
      return { restoredCount: restoredIds.length };
    }),

  listHistory: permProcedure
    .input(historyQuerySchema)
    .query(async ({ ctx, input }) => {
      const roles = await assignedRoles(ctx.session.user.id);
      const record = await issueRecord(input.id);
      if (!record)
        throw new TRPCError({ code: "NOT_FOUND", message: "Issue not found." });
      requireRecordAccess(record, roles, "read");
      const cursor = input.cursor
        ? await db.query.IssueHistory.findFirst({
            where: and(
              eq(IssueHistory.id, input.cursor),
              eq(IssueHistory.issueId, input.id),
            ),
          })
        : null;
      const rows = await db.query.IssueHistory.findMany({
        limit: input.limit + 1,
        orderBy: [desc(IssueHistory.createdAt), desc(IssueHistory.id)],
        where: and(
          eq(IssueHistory.issueId, input.id),
          cursor
            ? or(
                lt(IssueHistory.createdAt, cursor.createdAt),
                and(
                  eq(IssueHistory.createdAt, cursor.createdAt),
                  lt(IssueHistory.id, cursor.id),
                ),
              )
            : undefined,
        ),
      });
      const hasMore = rows.length > input.limit;
      const page = rows.slice(0, input.limit);
      const currentNames = await resolveMemberDisplayNamesByUserId(
        page.map((row) => row.actorId),
      );
      return {
        nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
        rows: page.map((row) => ({
          ...row,
          actorDisplayName:
            (row.actorId && currentNames.get(row.actorId)) ??
            row.actorDisplayName,
        })),
      };
    }),

  listTeams: permProcedure.query(async ({ ctx }) => {
    const roles = await assignedRoles(ctx.session.user.id);
    requireIssueDiscovery(roles);
    const officer = roleHasIssueCapability(roles, "IS_OFFICER");
    const roleRows = officer
      ? await db.select().from(Roles).orderBy(asc(Roles.name))
      : await db
          .select()
          .from(Roles)
          .where(
            inArray(
              Roles.id,
              roles.map((role) => role.id),
            ),
          )
          .orderBy(asc(Roles.name));
    return roleRows.flatMap((role) => {
      const access = issueAccessForRoles({
        issue: { owningTeamId: role.id, visibleTeamIds: [] },
        roles,
      });
      return access.canRead
        ? [
            {
              canEdit: access.canEdit,
              color: role.teamHexcodeColor,
              id: role.id,
              name: role.name,
            },
          ]
        : [];
    });
  }),

  listAssignees: permProcedure
    .input(teamChoiceSchema)
    .query(async ({ ctx, input }) => {
      const roles = await assignedRoles(ctx.session.user.id);
      const access = issueAccessForRoles({
        issue: { owningTeamId: input.teamId, visibleTeamIds: [] },
        roles,
      });
      if (!access.canRead) throw new TRPCError({ code: "FORBIDDEN" });
      const rows = await db
        .select({
          discordUserId: User.discordUserId,
          firstName: Member.firstName,
          id: User.id,
          lastName: Member.lastName,
          name: User.name,
        })
        .from(User)
        .innerJoin(Permissions, eq(Permissions.userId, User.id))
        .leftJoin(Member, eq(Member.userId, User.id))
        .where(eq(Permissions.roleId, input.teamId));
      return rows
        .map((row) => ({
          id: row.id,
          name:
            row.firstName && row.lastName
              ? `${row.firstName} ${row.lastName}`
              : nonBlankDisplayName(row.name, row.discordUserId),
        }))
        .sort((left, right) => left.name.localeCompare(right.name));
    }),

  listEvents: permProcedure.query(async ({ ctx }) => {
    const roles = await assignedRoles(ctx.session.user.id);
    requireIssueDiscovery(roles);
    const rows = await db
      .select()
      .from(Event)
      .where(and(isNull(Event.hackathonId), isNull(Event.deletionIntentAt)))
      .orderBy(desc(Event.start_datetime));
    return rows
      .filter((event) => eventAvailableToRoles(event, roles))
      .slice(0, 100)
      .map((event) => ({
        end: event.end_datetime,
        id: event.id,
        name: event.name,
        start: event.start_datetime,
      }));
  }),

  listTemplates: permProcedure.query(async ({ ctx }) => {
    const roles = await assignedRoles(ctx.session.user.id);
    requireIssueDiscovery(roles);
    if (
      !roleHasIssueCapability(roles, "READ_ISSUE_TEMPLATES") &&
      !roleHasIssueCapability(roles, "EDIT_ISSUE_TEMPLATES")
    )
      return [];
    const canRepair = roleHasIssueCapability(roles, "EDIT_ISSUE_TEMPLATES");
    return db
      .select()
      .from(Template)
      .where(canRepair ? undefined : isNull(Template.disabledAt))
      .orderBy(asc(Template.name));
  }),

  createTemplate: permProcedure
    .input(issueTemplateCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const roles = await assignedRoles(ctx.session.user.id);
      if (!roleHasIssueCapability(roles, "EDIT_ISSUE_TEMPLATES"))
        throw new TRPCError({ code: "FORBIDDEN" });
      return db.transaction(async (tx) => {
        const [created] = await tx
          .insert(Template)
          .values({
            body: input.body,
            name: input.name,
            normalizedName: input.normalizedName,
          })
          .returning();
        if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const metrics = treeMetrics(input.body);
        await createAdminAuditEvent(
          {
            actionKey: "issue.template.created",
            actor: ctx.session.user,
            metadata: {
              name: created.name,
              nodeCount: metrics.nodeCount,
              treeDepth: metrics.depth,
            },
            subjects: [
              {
                relation: "primary",
                targetId: created.id,
                targetLabel: created.name,
                targetType: "issue_template",
              },
            ],
          },
          tx,
        );
        return created;
      });
    }),

  updateTemplate: permProcedure
    .input(templateUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const roles = await assignedRoles(ctx.session.user.id);
      if (!roleHasIssueCapability(roles, "EDIT_ISSUE_TEMPLATES"))
        throw new TRPCError({ code: "FORBIDDEN" });
      const parsed = issueTemplateCreateSchema.parse({
        body: input.body,
        name: input.name,
      });
      return db.transaction(async (tx) => {
        const existing = await tx.query.Template.findFirst({
          where: eq(Template.id, input.id),
        });
        if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
        const [updated] = await tx
          .update(Template)
          .set({
            body: parsed.body,
            disabledAt: null,
            disabledReason: null,
            name: parsed.name,
            normalizedName: parsed.normalizedName,
            updatedAt: new Date(),
          })
          .where(eq(Template.id, input.id))
          .returning();
        if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
        const metrics = treeMetrics(parsed.body);
        await createAdminAuditEvent(
          {
            actionKey: "issue.template.updated",
            actor: ctx.session.user,
            changes: [
              { after: updated.name, before: existing.name, field: "name" },
              {
                after: false,
                before: existing.disabledAt !== null,
                field: "disabled",
              },
            ].filter((change) => change.after !== change.before),
            metadata: {
              nodeCount: metrics.nodeCount,
              treeDepth: metrics.depth,
            },
            subjects: [
              {
                relation: "primary",
                targetId: updated.id,
                targetLabel: updated.name,
                targetType: "issue_template",
              },
            ],
          },
          tx,
        );
        return updated;
      });
    }),

  disableTemplate: permProcedure
    .input(templateIdSchema)
    .mutation(async ({ ctx, input }) => {
      const roles = await assignedRoles(ctx.session.user.id);
      if (!roleHasIssueCapability(roles, "EDIT_ISSUE_TEMPLATES"))
        throw new TRPCError({ code: "FORBIDDEN" });
      return db.transaction(async (tx) => {
        const [disabled] = await tx
          .update(Template)
          .set({
            disabledAt: new Date(),
            disabledReason: "Disabled by an authorized Club operator.",
            normalizedName: null,
            updatedAt: new Date(),
          })
          .where(and(eq(Template.id, input.id), isNull(Template.disabledAt)))
          .returning();
        if (!disabled) throw new TRPCError({ code: "NOT_FOUND" });
        await createAdminAuditEvent(
          {
            actionKey: "issue.template.disabled",
            actor: ctx.session.user,
            changes: [{ after: true, before: false, field: "disabled" }],
            subjects: [
              {
                relation: "primary",
                targetId: disabled.id,
                targetLabel: disabled.name,
                targetType: "issue_template",
              },
            ],
          },
          tx,
        );
        return disabled;
      });
    }),
} satisfies TRPCRouterRecord;
