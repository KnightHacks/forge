import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";

import {
  and,
  count,
  eq,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  or,
  sql,
} from "@forge/db";
import { db } from "@forge/db/client";
import {
  Event,
  EventPublicationWork,
  Hackathon,
  HackathonEventPublication,
} from "@forge/db/schemas/knight-hacks";

import type { WriteDb } from "../db";
import type {
  PublicationProvider,
  PublicationWorkState,
} from "./publication-state";
import { hasHackathonEventHistory } from "./deletion";
import { createHackEventOrchestrator } from "./orchestrator";
import { nextPublicationRetryAt, publicationHealth } from "./publication-state";

const PROVIDERS = ["discord", "google"] as const;
const WORK_LEASE_MS = 60_000;

type PublicationRow = typeof HackathonEventPublication.$inferSelect;
type EventRow = typeof Event.$inferSelect;

function projection(event: EventRow, provider: PublicationProvider) {
  return provider === "discord"
    ? {
        appliedRevision: event.discordAppliedRevision,
        id: event.discordId,
        state: event.discordSyncState,
      }
    : {
        appliedRevision: event.googleAppliedRevision,
        id: event.googleId,
        state: event.googleSyncState,
      };
}

function desiredWorkState({
  event,
  targetEnabled,
  provider,
}: {
  event: EventRow;
  targetEnabled: boolean;
  provider: PublicationProvider;
}): PublicationWorkState {
  const current = projection(event, provider);
  if (current.state === "unknown") return "blocked";
  if (targetEnabled) {
    return current.state === "synced" &&
      current.id !== null &&
      current.appliedRevision === event.syncRevision
      ? "succeeded"
      : "pending";
  }
  return current.id === null && current.state === "disabled"
    ? "succeeded"
    : "pending";
}

/**
 * Serializes event membership changes with bulk publication toggles.
 *
 * Call this before locking or deleting an individual event. Keeping one lock
 * order (hackathon, then event/work rows) prevents a toggle from retaining a
 * stale event snapshot while a concurrent delete commits.
 */
export async function lockHackathonEventPublicationScope(
  database: WriteDb,
  hackathonId: string,
) {
  const [hackathon] = await database
    .select({ id: Hackathon.id })
    .from(Hackathon)
    .where(eq(Hackathon.id, hackathonId))
    // This is the serialization boundary between event writes and a bulk
    // publication toggle. Event create/update calls this inside its owning
    // transaction, so a toggle either sees that event or the event sees the
    // toggle's new revision; neither can commit work from a stale snapshot.
    .for("no key update")
    .limit(1);
  if (!hackathon) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Hackathon not found." });
  }
}

async function ensurePublicationRows(database: WriteDb, hackathonId: string) {
  await lockHackathonEventPublicationScope(database, hackathonId);
  await database
    .insert(HackathonEventPublication)
    .values(
      PROVIDERS.map((provider) => ({
        desiredEnabled: false,
        hackathonId,
        provider,
        revision: 1,
      })),
    )
    .onConflictDoNothing();
  return database
    .select()
    .from(HackathonEventPublication)
    .where(eq(HackathonEventPublication.hackathonId, hackathonId));
}

async function upsertWork(
  database: WriteDb,
  publication: PublicationRow,
  events: readonly EventRow[],
  now: Date,
) {
  if (!events.length) return;
  const existing = await database
    .select()
    .from(EventPublicationWork)
    .where(
      and(
        eq(EventPublicationWork.provider, publication.provider),
        inArray(
          EventPublicationWork.eventId,
          events.map((event) => event.id),
        ),
      ),
    );
  const existingByEventId = new Map(existing.map((row) => [row.eventId, row]));
  const values = events.map((event) => {
    const targetEnabled = event.deletionIntentAt
      ? false
      : publication.desiredEnabled;
    const state = desiredWorkState({
      event,
      provider: publication.provider,
      targetEnabled,
    });
    return {
      attemptCount: 0,
      completedAt: state === "succeeded" ? now : null,
      eventId: event.id,
      eventRevision: event.syncRevision,
      hackathonId: publication.hackathonId,
      lastAttemptAt: null,
      lastError: null,
      nextAttemptAt: state === "pending" ? now : null,
      provider: publication.provider,
      publicationId: publication.id,
      publicationRevision: publication.revision,
      state,
      targetEnabled,
    };
  });
  const inserts = values.filter(
    (value) => !existingByEventId.has(value.eventId),
  );
  if (inserts.length) {
    await database
      .insert(EventPublicationWork)
      .values(inserts)
      .onConflictDoNothing();
  }
  for (const value of values) {
    const current = existingByEventId.get(value.eventId);
    if (
      !current ||
      (current.eventRevision === value.eventRevision &&
        current.publicationRevision === value.publicationRevision &&
        current.targetEnabled === value.targetEnabled)
    ) {
      continue;
    }
    await database
      .update(EventPublicationWork)
      .set({
        attemptCount: 0,
        completedAt: value.completedAt,
        eventRevision: value.eventRevision,
        hackathonId: value.hackathonId,
        lastAttemptAt: null,
        lastError: null,
        leaseExpiresAt: null,
        leaseToken: null,
        nextAttemptAt: value.nextAttemptAt,
        publicationId: value.publicationId,
        publicationRevision: value.publicationRevision,
        state: value.state,
        targetEnabled: value.targetEnabled,
        updatedAt: now,
      })
      .where(eq(EventPublicationWork.id, current.id));
  }
}

export async function ensureEventPublicationWork({
  database = db,
  eventIds,
  hackathonId,
  now = new Date(),
}: {
  database?: WriteDb;
  eventIds: readonly string[];
  hackathonId: string;
  now?: Date;
}) {
  if (!eventIds.length) return;
  const publications = await ensurePublicationRows(database, hackathonId);
  for (const publication of publications) {
    if (publication.desiredEnabled) continue;
    if (publication.provider === "discord") {
      await database
        .update(Event)
        .set({ discordSyncState: "disabled" })
        .where(
          and(
            eq(Event.hackathonId, hackathonId),
            inArray(Event.id, [...eventIds]),
            eq(Event.legacy, false),
            isNull(Event.discordId),
            ne(Event.discordSyncState, "unknown"),
          ),
        );
    } else {
      await database
        .update(Event)
        .set({ googleSyncState: "disabled" })
        .where(
          and(
            eq(Event.hackathonId, hackathonId),
            inArray(Event.id, [...eventIds]),
            eq(Event.legacy, false),
            isNull(Event.googleId),
            ne(Event.googleSyncState, "unknown"),
          ),
        );
    }
  }
  const events = await database
    .select()
    .from(Event)
    .where(
      and(
        eq(Event.hackathonId, hackathonId),
        inArray(Event.id, [...eventIds]),
        eq(Event.legacy, false),
      ),
    );
  for (const publication of publications) {
    await upsertWork(database, publication, events, now);
  }
}

export async function loadEventPublicationHealth(hackathonId: string) {
  const eventIds = await db
    .select({ id: Event.id })
    .from(Event)
    .where(and(eq(Event.hackathonId, hackathonId), eq(Event.legacy, false)));
  await ensureEventPublicationWork({
    eventIds: eventIds.map((event) => event.id),
    hackathonId,
  });
  const publications = await ensurePublicationRows(db, hackathonId);
  const work = await db
    .select({
      attemptCount: EventPublicationWork.attemptCount,
      eventId: EventPublicationWork.eventId,
      lastError: EventPublicationWork.lastError,
      nextAttemptAt: EventPublicationWork.nextAttemptAt,
      provider: EventPublicationWork.provider,
      state: EventPublicationWork.state,
    })
    .from(EventPublicationWork)
    .where(eq(EventPublicationWork.hackathonId, hackathonId));
  const events = await db
    .select({
      discordId: Event.discordId,
      googleId: Event.googleId,
      id: Event.id,
      name: Event.name,
    })
    .from(Event)
    .where(and(eq(Event.hackathonId, hackathonId), eq(Event.legacy, false)));
  const names = new Map(events.map((event) => [event.id, event.name]));

  return {
    hackathonId,
    providers: publications.map((publication) => {
      const providerWork = work.filter(
        (row) => row.provider === publication.provider,
      );
      const remoteCount = events.filter((event) =>
        publication.provider === "discord"
          ? event.discordId !== null
          : event.googleId !== null,
      ).length;
      return {
        desiredEnabled: publication.desiredEnabled,
        issues: providerWork
          .filter(
            (row): row is typeof row & { state: "blocked" | "failed" } =>
              row.state === "blocked" || row.state === "failed",
          )
          .map((row) => ({
            attemptCount: row.attemptCount,
            eventId: row.eventId,
            eventName: names.get(row.eventId) ?? "Deleted event",
            lastError: row.lastError,
            nextAttemptAt: row.nextAttemptAt?.toISOString() ?? null,
            state: row.state,
          })),
        provider: publication.provider,
        requestedAt: publication.requestedAt.toISOString(),
        revision: publication.revision,
        ...publicationHealth({
          desiredEnabled: publication.desiredEnabled,
          remoteCount,
          states: providerWork.map((row) => row.state),
        }),
      };
    }),
  };
}

export async function setEventPublicationDesiredState({
  actorId,
  audit,
  desiredEnabled,
  expectedRemoteCount,
  expectedRevision,
  hackathonId,
  provider,
}: {
  actorId: string;
  audit: (
    result: { revision: number; workItemCount: number },
    database: WriteDb,
  ) => Promise<void>;
  desiredEnabled: boolean;
  expectedRemoteCount?: number;
  expectedRevision: number;
  hackathonId: string;
  provider: PublicationProvider;
}) {
  await db.transaction(async (tx) => {
    await ensurePublicationRows(tx, hackathonId);
    const [publication] = await tx
      .select()
      .from(HackathonEventPublication)
      .where(
        and(
          eq(HackathonEventPublication.hackathonId, hackathonId),
          eq(HackathonEventPublication.provider, provider),
        ),
      )
      .for("update")
      .limit(1);
    if (!publication) throw new Error("Publication row was not created.");
    if (publication.revision !== expectedRevision) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Publication settings changed. Refresh and try again.",
      });
    }
    const idColumn = provider === "discord" ? Event.discordId : Event.googleId;
    const [remote] = await tx
      .select({ value: count(Event.id) })
      .from(Event)
      .where(
        and(
          eq(Event.hackathonId, hackathonId),
          eq(Event.legacy, false),
          isNotNull(idColumn),
        ),
      );
    const remoteCount = remote?.value ?? 0;
    if (!desiredEnabled && expectedRemoteCount !== remoteCount) {
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "The number of published events changed. Review and confirm again.",
      });
    }
    if (publication.desiredEnabled === desiredEnabled) {
      const [work] = await tx
        .select({ value: count(EventPublicationWork.id) })
        .from(EventPublicationWork)
        .where(eq(EventPublicationWork.publicationId, publication.id));
      await audit(
        {
          revision: publication.revision,
          workItemCount: work?.value ?? 0,
        },
        tx,
      );
      return;
    }
    const now = new Date();
    const [updated] = await tx
      .update(HackathonEventPublication)
      .set({
        desiredEnabled,
        lastConvergedAt: null,
        requestedAt: now,
        requestedBy: actorId,
        revision: publication.revision + 1,
      })
      .where(eq(HackathonEventPublication.id, publication.id))
      .returning();
    if (!updated) throw new Error("Publication update returned no row.");
    const events = await tx
      .select()
      .from(Event)
      .where(and(eq(Event.hackathonId, hackathonId), eq(Event.legacy, false)));
    await upsertWork(tx, updated, events, now);
    await audit(
      { revision: updated.revision, workItemCount: events.length },
      tx,
    );
  });
  return loadEventPublicationHealth(hackathonId);
}

export async function retryEventPublication({
  audit,
  eventIds,
  hackathonId,
  provider,
}: {
  audit?: (
    result: {
      blockedCount: number;
      requeuedCount: number;
      revision: number;
    },
    database: WriteDb,
  ) => Promise<void>;
  eventIds?: readonly string[];
  hackathonId: string;
  provider: PublicationProvider;
}) {
  const now = new Date();
  const summary = await db.transaction(async (tx) => {
    const requeued = await tx
      .update(EventPublicationWork)
      .set({
        lastError: null,
        nextAttemptAt: now,
        state: "pending",
      })
      .where(
        and(
          eq(EventPublicationWork.hackathonId, hackathonId),
          eq(EventPublicationWork.provider, provider),
          inArray(EventPublicationWork.state, ["failed", "pending"]),
          eventIds?.length
            ? inArray(EventPublicationWork.eventId, [...eventIds])
            : undefined,
        ),
      )
      .returning({ id: EventPublicationWork.id });
    const [blocked] = await tx
      .select({ value: count(EventPublicationWork.id) })
      .from(EventPublicationWork)
      .where(
        and(
          eq(EventPublicationWork.hackathonId, hackathonId),
          eq(EventPublicationWork.provider, provider),
          eq(EventPublicationWork.state, "blocked"),
          eventIds?.length
            ? inArray(EventPublicationWork.eventId, [...eventIds])
            : undefined,
        ),
      );
    const [publication] = await tx
      .select({ revision: HackathonEventPublication.revision })
      .from(HackathonEventPublication)
      .where(
        and(
          eq(HackathonEventPublication.hackathonId, hackathonId),
          eq(HackathonEventPublication.provider, provider),
        ),
      )
      .limit(1);
    if (!publication) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Publication settings were not found.",
      });
    }
    const result = {
      blockedCount: blocked?.value ?? 0,
      requeuedCount: requeued.length,
      revision: publication.revision,
    };
    await audit?.(result, tx);
    return result;
  });
  return {
    blockedCount: summary.blockedCount,
    health: await loadEventPublicationHealth(hackathonId),
    requeuedCount: summary.requeuedCount,
  };
}

export async function claimEventPublicationWork({
  limit = 25,
  now = new Date(),
}: {
  limit?: number;
  now?: Date;
} = {}) {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: EventPublicationWork.id })
      .from(EventPublicationWork)
      .where(
        or(
          and(
            inArray(EventPublicationWork.state, ["pending", "failed"]),
            or(
              isNull(EventPublicationWork.nextAttemptAt),
              lte(EventPublicationWork.nextAttemptAt, now),
            ),
          ),
          and(
            eq(EventPublicationWork.state, "processing"),
            lte(EventPublicationWork.leaseExpiresAt, now),
          ),
        ),
      )
      .for("update", { skipLocked: true })
      .limit(limit);
    if (!rows.length) return [];
    const leaseToken = randomUUID();
    return tx
      .update(EventPublicationWork)
      .set({
        attemptCount: sql`${EventPublicationWork.attemptCount} + 1`,
        lastAttemptAt: now,
        lastError: null,
        leaseExpiresAt: new Date(now.getTime() + WORK_LEASE_MS),
        leaseToken,
        nextAttemptAt: null,
        state: "processing",
      })
      .where(
        inArray(
          EventPublicationWork.id,
          rows.map((row) => row.id),
        ),
      )
      .returning();
  });
}

async function finishWork({
  error,
  state,
  work,
}: {
  error: string | null;
  state: PublicationWorkState;
  work: typeof EventPublicationWork.$inferSelect;
}) {
  if (!work.leaseToken) return;
  const leaseToken = work.leaseToken;
  const now = new Date();
  const [saved] = await db
    .update(EventPublicationWork)
    .set({
      completedAt: state === "succeeded" ? now : null,
      lastError: error,
      leaseExpiresAt: null,
      leaseToken: null,
      nextAttemptAt:
        state === "failed" || state === "pending"
          ? nextPublicationRetryAt({ attemptCount: work.attemptCount, now })
          : null,
      state,
    })
    .where(
      and(
        eq(EventPublicationWork.id, work.id),
        eq(EventPublicationWork.leaseToken, leaseToken),
        eq(EventPublicationWork.eventRevision, work.eventRevision),
        eq(EventPublicationWork.publicationRevision, work.publicationRevision),
      ),
    )
    .returning({ publicationId: EventPublicationWork.publicationId });
  if (!saved) return;
  const [remaining] = await db
    .select({ value: count(EventPublicationWork.id) })
    .from(EventPublicationWork)
    .where(
      and(
        eq(EventPublicationWork.publicationId, saved.publicationId),
        sql`${EventPublicationWork.state} <> 'succeeded'`,
      ),
    );
  await db
    .update(HackathonEventPublication)
    .set(
      (remaining?.value ?? 0) === 0
        ? { lastConvergedAt: now, lastReconciledAt: now }
        : { lastReconciledAt: now },
    )
    .where(eq(HackathonEventPublication.id, saved.publicationId));
  if (state !== "succeeded") return;
  await db.transaction(async (tx) => {
    const [event] = await tx
      .select({ deletionIntentAt: Event.deletionIntentAt, id: Event.id })
      .from(Event)
      .where(
        and(
          eq(Event.id, work.eventId),
          eq(Event.hackathonId, work.hackathonId),
        ),
      )
      .for("update")
      .limit(1);
    if (!event?.deletionIntentAt) return;
    const [unfinished] = await tx
      .select({ value: count(EventPublicationWork.id) })
      .from(EventPublicationWork)
      .where(
        and(
          eq(EventPublicationWork.eventId, work.eventId),
          sql`${EventPublicationWork.state} <> 'succeeded'`,
        ),
      );
    if (
      (unfinished?.value ?? 0) !== 0 ||
      (await hasHackathonEventHistory(tx, {
        eventId: work.eventId,
        hackathonId: work.hackathonId,
      }))
    ) {
      return;
    }
    await tx
      .delete(Event)
      .where(
        and(eq(Event.id, work.eventId), isNotNull(Event.deletionIntentAt)),
      );
  });
}

export async function executeEventPublicationWork(
  work: typeof EventPublicationWork.$inferSelect,
) {
  if (!work.leaseToken) return;
  const [current] = await db
    .select({ event: Event, publication: HackathonEventPublication })
    .from(EventPublicationWork)
    .innerJoin(Event, eq(Event.id, EventPublicationWork.eventId))
    .innerJoin(
      HackathonEventPublication,
      eq(HackathonEventPublication.id, EventPublicationWork.publicationId),
    )
    .where(
      and(
        eq(EventPublicationWork.id, work.id),
        eq(EventPublicationWork.leaseToken, work.leaseToken),
      ),
    )
    .limit(1);
  if (!current) return;
  if (
    current.event.syncRevision !== work.eventRevision ||
    current.publication.revision !== work.publicationRevision ||
    (current.event.deletionIntentAt
      ? false
      : current.publication.desiredEnabled) !== work.targetEnabled
  ) {
    await upsertWork(db, current.publication, [current.event], new Date());
    return;
  }

  let result: { status: string };
  try {
    const orchestrator = await createHackEventOrchestrator(
      null,
      work.hackathonId,
    );
    result = work.targetEnabled
      ? await orchestrator.sync(work.eventId, {
          actorId: current.publication.requestedBy ?? "system",
          providers: [work.provider],
        })
      : await orchestrator.disableProvider(work.eventId, {
          actorId: current.publication.requestedBy ?? "system",
          provider: work.provider,
        });
  } catch (error) {
    await finishWork({
      error:
        error instanceof Error
          ? error.message.slice(0, 500)
          : "Provider reconciliation failed.",
      state: "failed",
      work,
    });
    return;
  }
  const event = await db.query.Event.findFirst({
    where: and(
      eq(Event.id, work.eventId),
      eq(Event.hackathonId, work.hackathonId),
    ),
  });
  if (!event) return;
  const currentProjection = projection(event, work.provider);
  const succeeded = work.targetEnabled
    ? currentProjection.state === "synced" &&
      currentProjection.id !== null &&
      currentProjection.appliedRevision === work.eventRevision
    : currentProjection.state === "disabled" && currentProjection.id === null;
  const blocked =
    currentProjection.state === "unknown" ||
    result.status === "needs_attention";
  const failed =
    currentProjection.state === "error" || result.status === "error";
  await finishWork({
    error: blocked
      ? "Provider outcome is ambiguous. Review the event before retrying."
      : failed
        ? "Provider reconciliation failed. Retry when the provider is available."
        : null,
    state: succeeded
      ? "succeeded"
      : blocked
        ? "blocked"
        : failed
          ? "failed"
          : "pending",
    work,
  });
}

export async function runEventPublicationCycle({ limit = 25 } = {}) {
  const work = await claimEventPublicationWork({ limit });
  for (const item of work) await executeEventPublicationWork(item);
  return { claimed: work.length };
}
