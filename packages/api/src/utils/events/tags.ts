import { TRPCError } from "@trpc/server";

import { logger } from "@forge/utils";

export interface EventTagRecord {
  active: boolean;
  color: string;
  createdAt: Date;
  defaultPoints: number;
  id: string;
  name: string;
  normalizedName: string;
  updatedAt: Date;
}

interface EventTagState {
  getTag(tagId: string): Promise<EventTagRecord | null>;
  listTags(): Promise<EventTagRecord[]>;
  saveTag(tag: EventTagRecord): Promise<EventTagRecord>;
  withTagLock<T>(tagId: string, operation: () => Promise<T>): Promise<T>;
}

type EventTagAudit = (entry: {
  action: "archive" | "create" | "update";
  actorId: string;
  tagId: string;
}) => Promise<unknown>;

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function normalizedKey(name: string) {
  return normalizeName(name).toLocaleLowerCase("en-US");
}

function normalizeColor(color: string) {
  const normalized = color.toLocaleLowerCase("en-US");
  if (!/^#[0-9a-f]{6}$/.test(normalized)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Choose a valid tag color.",
    });
  }
  return normalized;
}

function assertPoints(points: number) {
  if (!Number.isInteger(points) || points < 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Event points must be a non-negative whole number.",
    });
  }
}

export function createEventTagService({
  audit,
  clock,
  idFactory,
  reportAuditFailure = () => logger.warn("Event tag audit transport failed."),
  state,
}: {
  audit: EventTagAudit;
  clock: () => Date;
  idFactory: () => string;
  reportAuditFailure?: () => void;
  state: EventTagState;
}) {
  const attemptAudit = async (entry: Parameters<EventTagAudit>[0]) => {
    try {
      await audit(entry);
    } catch {
      try {
        reportAuditFailure();
      } catch {
        // Failure reporting must not affect committed product state.
      }
    }
  };

  const assertUnique = async (name: string, excludingId?: string) => {
    const key = normalizedKey(name);
    const duplicate = (await state.listTags()).some(
      (tag) => tag.id !== excludingId && tag.normalizedName === key,
    );
    if (duplicate) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "An event tag already uses that name.",
      });
    }
  };

  return {
    async archive({ actorId, tagId }: { actorId: string; tagId: string }) {
      const updated = await state.withTagLock(tagId, async () => {
        const tag = await state.getTag(tagId);
        if (!tag)
          throw new TRPCError({ code: "NOT_FOUND", message: "Tag not found." });
        const updated = await state.saveTag({
          ...tag,
          active: false,
          updatedAt: clock(),
        });
        return updated;
      });
      await attemptAudit({ action: "archive", actorId, tagId });
      return updated;
    },

    async create(input: {
      actorId: string;
      color: string;
      defaultPoints: number;
      name: string;
    }) {
      assertPoints(input.defaultPoints);
      await assertUnique(input.name);
      const now = clock();
      const tag: EventTagRecord = {
        active: true,
        color: normalizeColor(input.color),
        createdAt: now,
        defaultPoints: input.defaultPoints,
        id: idFactory(),
        name: normalizeName(input.name),
        normalizedName: normalizedKey(input.name),
        updatedAt: now,
      };
      const created = await state.saveTag(tag);
      await attemptAudit({
        action: "create",
        actorId: input.actorId,
        tagId: created.id,
      });
      return created;
    },

    async resolveActiveSnapshot({
      pointsOverride,
      tagId,
    }: {
      pointsOverride: number | null;
      tagId: string;
    }) {
      return state.withTagLock(tagId, async () => {
        const tag = await state.getTag(tagId);
        if (!tag)
          throw new TRPCError({ code: "NOT_FOUND", message: "Tag not found." });
        if (!tag.active) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "That event tag is archived.",
          });
        }
        const points = pointsOverride ?? tag.defaultPoints;
        assertPoints(points);
        return { color: tag.color, points, tag: tag.name };
      });
    },

    async update(input: {
      actorId: string;
      color?: string;
      defaultPoints?: number;
      name?: string;
      tagId: string;
    }) {
      const updated = await state.withTagLock(input.tagId, async () => {
        const tag = await state.getTag(input.tagId);
        if (!tag)
          throw new TRPCError({ code: "NOT_FOUND", message: "Tag not found." });
        const color = input.color ?? tag.color;
        const defaultPoints = input.defaultPoints ?? tag.defaultPoints;
        const name = input.name ?? tag.name;
        assertPoints(defaultPoints);
        await assertUnique(name, input.tagId);
        const updated = await state.saveTag({
          ...tag,
          color: normalizeColor(color),
          defaultPoints,
          name: normalizeName(name),
          normalizedName: normalizedKey(name),
          updatedAt: clock(),
        });
        return updated;
      });
      await attemptAudit({
        action: "update",
        actorId: input.actorId,
        tagId: input.tagId,
      });
      return updated;
    },
  };
}
