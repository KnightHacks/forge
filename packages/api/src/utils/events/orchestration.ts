import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";

import { logger } from "@forge/utils";

import { assertClubEvent } from "./access";

type ProviderName = "discord" | "google";
type ProviderState = "error" | "pending" | "synced" | "unknown";

export interface EventProjection {
  appliedDestination: string | null;
  appliedRevision: number | null;
  attemptRevision: number | null;
  attemptToken: string | null;
  id: string | null;
  state: ProviderState | null;
}

export interface EventWorkflowRecord {
  attendanceCount: number;
  audience: "dues" | "public" | "roles";
  creationKey: string | null;
  deletionIntentAt: Date | null;
  description: string;
  discord: EventProjection;
  discordChannel: { id: string; type: "stage" | "voice" } | null;
  discordNoProjectionAcknowledgedAt?: Date | null;
  discordNoProjectionAcknowledgedBy?: string | null;
  endAt: Date;
  google: EventProjection;
  hackathonId: string | null;
  id: string;
  internal: boolean;
  legacy: boolean;
  legacyDuesRequired: boolean;
  location: string;
  name: string;
  points: number;
  publishedAt: Date | null;
  revision: number;
  roleIds: string[];
  startAt: Date;
  synchronizedVisibility: {
    audience: "dues" | "public" | "roles";
    internal: boolean;
    roleIds: string[];
  } | null;
  tag: string;
  tagColor: string;
}

export interface EventProjectionRequest {
  channelId: string | null;
  creationKey: string;
  description: string;
  destination: string;
  endAt: Date;
  entityType: "external" | "stage" | "voice";
  eventId: string;
  location: string;
  points: number;
  privateProperties?: Record<string, string>;
  revision: number;
  startAt: Date;
  title: string;
}

export type ProviderResult =
  | { id: string; kind: "success"; request?: EventProjectionRequest }
  | { kind: "not_found" }
  | { kind: "transient_error"; message: string }
  | { acceptedId?: string; kind: "unknown"; message: string };

export interface LiveProjection {
  id: string;
  request: EventProjectionRequest;
}

export interface EventProviderGateway {
  create(request: EventProjectionRequest): Promise<ProviderResult>;
  delete(
    id: string,
    appliedDestination?: string | null,
  ): Promise<ProviderResult>;
  get(id: string, appliedDestination?: string | null): Promise<ProviderResult>;
  list(): Promise<LiveProjection[]>;
  update(id: string, request: EventProjectionRequest): Promise<ProviderResult>;
  findByPrivateIdentity?(
    eventId: string,
    creationKey: string,
  ): LiveProjection[] | Promise<LiveProjection[]>;
}

interface EventWorkflowState {
  acquireSyncLease(input: {
    eventId: string;
    expiresAt: Date;
    now: Date;
    revision: number;
    token: string;
  }): Promise<boolean>;
  countAttendance(eventId: string): Promise<number>;
  createOrReuseEvent(
    event: EventWorkflowRecord,
    payloadHash: string,
  ): Promise<{
    created: boolean;
    event: EventWorkflowRecord;
    payloadMatches: boolean;
  }>;
  deleteEvent(
    eventId: string,
    fence?: { revision: number; token: string },
  ): Promise<boolean>;
  getEvent(eventId: string): Promise<EventWorkflowRecord | null>;
  ownsSyncLease(
    eventId: string,
    revision: number,
    token: string,
  ): Promise<boolean>;
  prepareDeletion(input: {
    at: Date;
    eventId: string;
    revision: number;
    token: string;
  }): Promise<
    | "attendance_exists"
    | "discord_ambiguous"
    | "fence_lost"
    | "in_flight_attempt"
    | "not_found"
    | "ready"
  >;
  recordProviderAttempt(input: {
    at: Date;
    eventId: string;
    provider: ProviderName;
    token: string;
  }): Promise<boolean>;
  renewSyncLease(input: {
    eventId: string;
    expiresAt: Date;
    now: Date;
    revision: number;
    token: string;
  }): Promise<boolean>;
  releaseSyncLease(eventId: string, token: string): Promise<boolean>;
  saveEvent(
    event: EventWorkflowRecord,
    fence?: { token: string },
  ): Promise<boolean>;
  saveProviderProjection(input: {
    eventId: string;
    projection: EventProjection;
    provider: ProviderName;
    revision: number;
    token: string;
  }): Promise<boolean>;
}

type EventAudit = (entry: {
  action:
    | "create"
    | "delete"
    | "repair"
    | "resolve_discord"
    | "sync"
    | "update"
    | "update_legacy";
  actorId: string;
  eventId: string;
}) => Promise<unknown>;

function canonicalCreationHash(event: EventWorkflowRecord) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        audience: event.audience,
        creationKey: event.creationKey,
        description: event.description,
        discordChannel: event.discordChannel,
        endAt: event.endAt.toISOString(),
        internal: event.internal,
        legacy: event.legacy,
        legacyDuesRequired: event.legacyDuesRequired,
        location: event.location,
        name: event.name,
        points: event.points,
        roleIds: [...event.roleIds].sort(),
        startAt: event.startAt.toISOString(),
        tag: event.tag,
        tagColor: event.tagColor,
      }),
    )
    .digest("hex");
}

function desiredDestination(
  event: EventWorkflowRecord,
  provider: ProviderName,
  googleCalendars: { internal: string; public: string },
) {
  if (provider === "google") {
    return event.internal ? googleCalendars.internal : googleCalendars.public;
  }
  if (!event.internal) return "external";
  if (!event.discordChannel) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Internal events require a Discord channel.",
    });
  }
  return `${event.discordChannel.type}:${event.discordChannel.id}`;
}

function projectionRequest(
  event: EventWorkflowRecord,
  provider: ProviderName,
  googleCalendars: { internal: string; public: string },
): EventProjectionRequest {
  if (!event.creationKey) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "This event has no creation identity.",
    });
  }
  const destination = desiredDestination(event, provider, googleCalendars);
  const entityType = event.internal
    ? (event.discordChannel?.type ?? "external")
    : "external";
  return {
    channelId:
      provider === "discord" && event.internal
        ? (event.discordChannel?.id ?? null)
        : null,
    creationKey: event.creationKey,
    description: `${event.description}\n\nLocation: ${event.location}\nPoints: ${event.points}`,
    destination,
    endAt: event.endAt,
    entityType,
    eventId: event.id,
    location: event.location,
    points: event.points,
    ...(provider === "google"
      ? {
          privateProperties: {
            bladeCreationKey: event.creationKey,
            bladeEventId: event.id,
          },
        }
      : {}),
    revision: event.revision,
    startAt: event.startAt,
    title: `[${event.tag}] ${event.name}`,
  };
}

export function assertEventProviderPayloadLimits(input: {
  description: string;
  location: string;
  name: string;
  points: number;
  tag: string;
}) {
  const title = `[${input.tag}] ${input.name}`;
  const description = `${input.description}\n\nLocation: ${input.location}\nPoints: ${input.points}`;
  if (Array.from(title).length > 100) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The tag and event name must fit within 100 characters.",
    });
  }
  if (Array.from(description).length > 1_000) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "The event description, location, and points must fit within 1,000 characters.",
    });
  }
}

function resultProjection(
  prior: EventProjection,
  result: ProviderResult,
  request: EventProjectionRequest,
  attemptToken: string,
): EventProjection {
  if (result.kind === "success") {
    return {
      appliedDestination: request.destination,
      appliedRevision: request.revision,
      attemptRevision: null,
      attemptToken: null,
      id: result.id,
      state: "synced",
    };
  }
  return {
    ...prior,
    attemptRevision: result.kind === "unknown" ? request.revision : null,
    attemptToken: result.kind === "unknown" ? attemptToken : null,
    state: result.kind === "unknown" ? "unknown" : "error",
  };
}

function projectionPayloadMatches(
  provider: ProviderName,
  live: EventProjectionRequest,
  desired: EventProjectionRequest,
) {
  const common =
    live.destination === desired.destination &&
    live.title === desired.title &&
    live.description === desired.description &&
    live.location === desired.location &&
    live.startAt.getTime() === desired.startAt.getTime() &&
    live.endAt.getTime() === desired.endAt.getTime();
  if (!common) return false;
  if (provider === "discord") {
    return (
      live.entityType === desired.entityType &&
      live.channelId === desired.channelId
    );
  }
  return (
    live.privateProperties?.bladeEventId ===
      desired.privateProperties?.bladeEventId &&
    live.privateProperties?.bladeCreationKey ===
      desired.privateProperties?.bladeCreationKey
  );
}

export function createEventSyncOrchestrator({
  audit,
  clock,
  config,
  discord,
  google,
  reportAuditFailure = () => logger.warn("Event audit transport failed."),
  reportLeaseFailure = () => logger.warn("Event sync lease heartbeat failed."),
  state,
  tokenFactory,
}: {
  audit: EventAudit;
  clock: () => Date;
  config: {
    googleCalendars: { internal: string; public: string };
    leaseDurationMs: number;
  };
  discord: EventProviderGateway;
  google: EventProviderGateway;
  reportAuditFailure?: () => void;
  reportLeaseFailure?: () => void;
  state: EventWorkflowState;
  tokenFactory: () => string;
}) {
  const gateways = { discord, google } as const;

  const attemptAudit = async (entry: Parameters<EventAudit>[0]) => {
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

  const attemptReportLeaseFailure = () => {
    try {
      reportLeaseFailure();
    } catch {
      // Failure reporting must not interrupt provider fencing.
    }
  };

  const persist = async (
    eventId: string,
    provider: ProviderName,
    projection: EventProjection,
    revision: number,
    token: string,
  ) =>
    state.saveProviderProjection({
      eventId,
      projection,
      provider,
      revision,
      token,
    });

  const callProvider = async (
    event: EventWorkflowRecord,
    provider: ProviderName,
    token: string,
    operation: "create" | "delete" | "update",
    id?: string,
  ) => {
    if (
      !(await state.recordProviderAttempt({
        at: clock(),
        eventId: event.id,
        provider,
        token,
      }))
    )
      return null;
    const gateway = gateways[provider];
    const heartbeatEveryMs = Math.max(
      1_000,
      Math.floor(config.leaseDurationMs / 3),
    );
    const heartbeat = setInterval(() => {
      const now = clock();
      void state
        .renewSyncLease({
          eventId: event.id,
          expiresAt: new Date(now.getTime() + config.leaseDurationMs),
          now,
          revision: event.revision,
          token,
        })
        .then((renewed) => {
          if (!renewed) attemptReportLeaseFailure();
        }, attemptReportLeaseFailure);
    }, heartbeatEveryMs);
    heartbeat.unref();
    try {
      if (operation === "delete") {
        return await gateway.delete(
          id ?? "",
          event[provider].appliedDestination,
        );
      }
      const request = projectionRequest(
        event,
        provider,
        config.googleCalendars,
      );
      return operation === "update" && id
        ? await gateway.update(id, request)
        : await gateway.create(request);
    } finally {
      clearInterval(heartbeat);
    }
  };

  const reconcileProvider = async (
    eventId: string,
    provider: ProviderName,
    token: string,
    revision: number,
    forceReconcile: boolean,
  ) => {
    let event = assertClubEvent(await state.getEvent(eventId));
    let prior = event[provider];
    const request = projectionRequest(event, provider, config.googleCalendars);

    if (prior.attemptToken && prior.state !== "unknown") {
      const ambiguous = { ...prior, state: "unknown" as const };
      if (!(await persist(event.id, provider, ambiguous, revision, token))) {
        return false;
      }
      event = assertClubEvent(await state.getEvent(eventId));
      prior = event[provider];
    }

    const alreadyCurrent =
      prior.state === "synced" &&
      prior.id &&
      prior.appliedRevision === revision &&
      prior.appliedDestination === request.destination;
    if (alreadyCurrent && !forceReconcile) {
      return persist(event.id, provider, prior, revision, token);
    }
    if (alreadyCurrent && forceReconcile && prior.id) {
      const observed = await gateways[provider].get(
        prior.id,
        prior.appliedDestination,
      );
      if (observed.kind === "not_found") {
        if (
          !(await persist(
            event.id,
            provider,
            {
              appliedDestination: null,
              appliedRevision: null,
              attemptRevision: null,
              attemptToken: null,
              id: null,
              state: "pending",
            },
            revision,
            token,
          ))
        ) {
          return false;
        }
        event = assertClubEvent(await state.getEvent(eventId));
        prior = event[provider];
      } else if (observed.kind !== "success") {
        return persist(
          event.id,
          provider,
          { ...prior, state: "error" },
          revision,
          token,
        );
      }
    }

    if (prior.state === "unknown") {
      if (prior.id) {
        const observed = await gateways[provider].get(
          prior.id,
          prior.appliedDestination,
        );
        if (prior.attemptToken) {
          if (
            observed.kind === "success" &&
            observed.request &&
            prior.attemptRevision === revision &&
            projectionPayloadMatches(provider, observed.request, request)
          ) {
            return persist(
              event.id,
              provider,
              {
                appliedDestination: request.destination,
                appliedRevision: revision,
                attemptRevision: null,
                attemptToken: null,
                id: observed.id,
                state: "synced",
              },
              revision,
              token,
            );
          }

          // A stale or mismatched read cannot prove that the prior mutation is
          // terminal. Keep the durable attempt marker so no successor write can
          // overlap a request that may still complete at the provider.
          return true;
        }
        if (observed.kind === "not_found") {
          if (
            !(await persist(
              event.id,
              provider,
              {
                appliedDestination: null,
                appliedRevision: null,
                attemptRevision: null,
                attemptToken: null,
                id: null,
                state: "pending",
              },
              revision,
              token,
            ))
          ) {
            return false;
          }
          event = assertClubEvent(await state.getEvent(eventId));
          prior = event[provider];
        } else if (observed.kind === "success" && observed.request) {
          if (projectionPayloadMatches(provider, observed.request, request)) {
            return persist(
              event.id,
              provider,
              {
                appliedDestination: request.destination,
                appliedRevision: revision,
                attemptRevision: null,
                attemptToken: null,
                id: observed.id,
                state: "synced",
              },
              revision,
              token,
            );
          }
          if (
            !(await persist(
              event.id,
              provider,
              {
                appliedDestination: observed.request.destination,
                appliedRevision: null,
                attemptRevision: null,
                attemptToken: null,
                id: observed.id,
                state: "pending",
              },
              revision,
              token,
            ))
          ) {
            return false;
          }
          event = assertClubEvent(await state.getEvent(eventId));
          prior = event[provider];
        } else {
          return true;
        }
      }
      if (
        prior.state === "unknown" &&
        provider === "google" &&
        !prior.id &&
        google.findByPrivateIdentity &&
        event.creationKey
      ) {
        try {
          const matches = await google.findByPrivateIdentity(
            event.id,
            event.creationKey,
          );
          const recovered =
            matches.length === 1
              ? {
                  appliedDestination: matches[0]?.request.destination ?? null,
                  appliedRevision: null,
                  attemptRevision: null,
                  attemptToken: null,
                  id: matches[0]?.id ?? null,
                  state: "pending" as const,
                }
              : matches.length === 0
                ? {
                    appliedDestination: null,
                    appliedRevision: null,
                    attemptRevision: null,
                    attemptToken: null,
                    id: null,
                    state: "pending" as const,
                  }
                : null;
          if (!recovered) return true;
          if (
            !(await persist(event.id, provider, recovered, revision, token))
          ) {
            return false;
          }
          event = assertClubEvent(await state.getEvent(eventId));
          prior = event[provider];
        } catch {
          return true;
        }
      } else if (prior.state === "unknown") {
        return true;
      }
    }

    if (prior.id && prior.appliedDestination !== request.destination) {
      const deletion = await callProvider(
        event,
        provider,
        token,
        "delete",
        prior.id,
      );
      if (!deletion) return false;
      if (deletion.kind !== "success" && deletion.kind !== "not_found") {
        return persist(
          event.id,
          provider,
          deletion.kind === "unknown"
            ? {
                ...prior,
                attemptRevision: revision,
                attemptToken: token,
                state: "unknown",
              }
            : {
                ...prior,
                attemptRevision: null,
                attemptToken: null,
                state: "error",
              },
          revision,
          token,
        );
      }
      if (
        !(await persist(
          event.id,
          provider,
          {
            appliedDestination: null,
            appliedRevision: null,
            attemptRevision: null,
            attemptToken: null,
            id: null,
            state: "pending",
          },
          revision,
          token,
        ))
      )
        return false;
      event = assertClubEvent(await state.getEvent(eventId));
    }

    const current = event[provider];
    if (current.id) {
      const update = await callProvider(
        event,
        provider,
        token,
        "update",
        current.id,
      );
      if (!update) return false;
      if (update.kind === "not_found") {
        if (
          !(await persist(
            event.id,
            provider,
            {
              appliedDestination: null,
              appliedRevision: null,
              attemptRevision: null,
              attemptToken: null,
              id: null,
              state: "pending",
            },
            revision,
            token,
          ))
        )
          return false;
        event = assertClubEvent(await state.getEvent(eventId));
      } else {
        return persist(
          event.id,
          provider,
          resultProjection(current, update, request, token),
          revision,
          token,
        );
      }
    }

    const creation = await callProvider(event, provider, token, "create");
    if (!creation) return false;
    return persist(
      event.id,
      provider,
      resultProjection(event[provider], creation, request, token),
      revision,
      token,
    );
  };

  const sync = async (
    eventId: string,
    {
      actorId,
      auditAction = "sync",
      forceProviders = [],
    }: {
      actorId: string;
      auditAction?: "create" | "repair" | "resolve_discord" | "sync" | "update";
      forceProviders?: readonly ProviderName[];
    },
  ) => {
    const initial = assertClubEvent(await state.getEvent(eventId));
    if (initial.deletionIntentAt) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This event is being deleted and cannot be synchronized.",
      });
    }
    if (initial.legacy) return { eventId, status: "legacy" as const };
    const token = tokenFactory();
    const now = clock();
    const acquired = await state.acquireSyncLease({
      eventId,
      expiresAt: new Date(now.getTime() + config.leaseDurationMs),
      now,
      revision: initial.revision,
      token,
    });
    if (!acquired) {
      await attemptAudit({ action: auditAction, actorId, eventId });
      return { eventId, status: "syncing" as const };
    }

    try {
      if (
        !(await reconcileProvider(
          eventId,
          "discord",
          token,
          initial.revision,
          forceProviders.includes("discord"),
        ))
      ) {
        return { eventId, status: "syncing" as const };
      }
      if (
        !(await reconcileProvider(
          eventId,
          "google",
          token,
          initial.revision,
          forceProviders.includes("google"),
        ))
      ) {
        return { eventId, status: "syncing" as const };
      }
      const current = assertClubEvent(await state.getEvent(eventId));
      const synchronized = (["discord", "google"] as const).every(
        (provider) =>
          current[provider].state === "synced" &&
          current[provider].id !== null &&
          current[provider].appliedRevision === current.revision,
      );
      let published = false;
      if (
        synchronized &&
        !current.deletionIntentAt &&
        (await state.ownsSyncLease(eventId, initial.revision, token))
      ) {
        current.publishedAt ??= clock();
        current.synchronizedVisibility = {
          audience: current.audience,
          internal: current.internal,
          roleIds: [...current.roleIds],
        };
        published = await state.saveEvent(current, { token });
      }
      return {
        eventId,
        status: published
          ? ("published" as const)
          : synchronized
            ? ("syncing" as const)
            : ("needs_attention" as const),
      };
    } finally {
      await state.releaseSyncLease(eventId, token);
      await attemptAudit({ action: auditAction, actorId, eventId });
    }
  };

  return {
    async create(
      event: EventWorkflowRecord,
      options: { actorId: string; payloadHash?: string },
    ) {
      if (!event.creationKey) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A creation key is required.",
        });
      }
      const reserved = await state.createOrReuseEvent(
        event,
        options.payloadHash ?? canonicalCreationHash(event),
      );
      if (!reserved.payloadMatches) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "That creation key belongs to different event details.",
        });
      }
      return sync(reserved.event.id, { ...options, auditAction: "create" });
    },

    async delete(eventId: string, { actorId }: { actorId: string }) {
      let event = assertClubEvent(await state.getEvent(eventId));
      const token = tokenFactory();
      const now = clock();
      if (
        !(await state.acquireSyncLease({
          eventId,
          expiresAt: new Date(now.getTime() + config.leaseDurationMs),
          now,
          revision: event.revision,
          token,
        }))
      ) {
        await attemptAudit({ action: "delete", actorId, eventId });
        return { eventId, status: "syncing" as const };
      }

      let preparation:
        | Awaited<ReturnType<EventWorkflowState["prepareDeletion"]>>
        | undefined;
      try {
        preparation = await state.prepareDeletion({
          at: now,
          eventId,
          revision: event.revision,
          token,
        });
      } catch (error) {
        await state.releaseSyncLease(eventId, token);
        await attemptAudit({ action: "delete", actorId, eventId });
        throw error;
      }

      if (preparation === "attendance_exists") {
        await state.releaseSyncLease(eventId, token);
        await attemptAudit({ action: "delete", actorId, eventId });
        throw new TRPCError({
          code: "CONFLICT",
          message: "Remove event attendance before deleting this event.",
        });
      }
      if (preparation === "discord_ambiguous") {
        await state.releaseSyncLease(eventId, token);
        await attemptAudit({ action: "delete", actorId, eventId });
        throw new TRPCError({
          code: "CONFLICT",
          message: "Resolve the unknown Discord projection before deletion.",
        });
      }
      if (preparation === "not_found") {
        await state.releaseSyncLease(eventId, token);
        await attemptAudit({ action: "delete", actorId, eventId });
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
      }
      if (preparation === "fence_lost") {
        await state.releaseSyncLease(eventId, token);
        await attemptAudit({ action: "delete", actorId, eventId });
        return { eventId, status: "syncing" as const };
      }
      if (preparation === "in_flight_attempt") {
        let fenceValid = true;
        try {
          event = assertClubEvent(await state.getEvent(eventId));
          for (const provider of ["discord", "google"] as const) {
            const projection = event[provider];
            if (!projection.id || !projection.attemptToken) continue;
            fenceValid = await persist(
              event.id,
              provider,
              { ...projection, state: "unknown" },
              event.revision,
              token,
            );
            if (!fenceValid) break;
          }
        } finally {
          await state.releaseSyncLease(eventId, token);
          await attemptAudit({ action: "delete", actorId, eventId });
        }
        return {
          eventId,
          status: fenceValid
            ? ("needs_attention" as const)
            : ("syncing" as const),
        };
      }

      event = assertClubEvent(await state.getEvent(eventId));
      if (event.legacy) {
        let deleted: boolean;
        try {
          deleted = await state.deleteEvent(event.id, {
            revision: event.revision,
            token,
          });
        } finally {
          await state.releaseSyncLease(eventId, token);
          await attemptAudit({ action: "delete", actorId, eventId });
        }
        return {
          eventId,
          status: deleted ? ("deleted" as const) : ("syncing" as const),
        };
      }

      let outcome:
        | { eventId: string; status: "deleted" }
        | { eventId: string; status: "needs_attention" | "syncing" };
      let deletionFailure: unknown;
      try {
        let fenceValid = true;
        event = assertClubEvent(await state.getEvent(eventId));
        if (
          event.google.state === "unknown" &&
          !event.google.id &&
          event.creationKey &&
          google.findByPrivateIdentity
        ) {
          try {
            const matches = await google.findByPrivateIdentity(
              event.id,
              event.creationKey,
            );
            const recovered =
              matches.length === 1
                ? {
                    appliedDestination: matches[0]?.request.destination ?? null,
                    appliedRevision: null,
                    attemptRevision: null,
                    attemptToken: null,
                    id: matches[0]?.id ?? null,
                    state: "pending" as const,
                  }
                : matches.length === 0
                  ? {
                      appliedDestination: null,
                      appliedRevision: null,
                      attemptRevision: null,
                      attemptToken: null,
                      id: null,
                      state: "pending" as const,
                    }
                  : null;
            if (recovered) {
              fenceValid = await persist(
                event.id,
                "google",
                recovered,
                event.revision,
                token,
              );
            }
          } catch {
            // A failed identity lookup cannot prove the ambiguous create absent.
          }
        }

        for (const provider of ["discord", "google"] as const) {
          if (!fenceValid) break;
          event = assertClubEvent(await state.getEvent(eventId));
          let projection = event[provider];
          if (projection.attemptToken || projection.state === "unknown") {
            if (projection.state !== "unknown") {
              if (
                !(await persist(
                  event.id,
                  provider,
                  { ...projection, state: "unknown" },
                  event.revision,
                  token,
                ))
              ) {
                fenceValid = false;
                continue;
              }
              event = assertClubEvent(await state.getEvent(eventId));
              projection = event[provider];
            }
            if (!projection.id) continue;
            const observed = await gateways[provider].get(
              projection.id,
              projection.appliedDestination,
            );
            if (projection.attemptToken) {
              if (
                projection.attemptRevision === event.revision &&
                observed.kind === "not_found"
              ) {
                fenceValid = await persist(
                  event.id,
                  provider,
                  {
                    appliedDestination: null,
                    appliedRevision: null,
                    attemptRevision: null,
                    attemptToken: null,
                    id: null,
                    state: "pending",
                  },
                  event.revision,
                  token,
                );
                if (!fenceValid) break;
              }

              // A present projection does not prove the prior deletion request
              // is terminal. Leave the attempt ambiguous and do not overlap it.
              continue;
            }
            if (observed.kind === "not_found") {
              fenceValid = await persist(
                event.id,
                provider,
                {
                  appliedDestination: null,
                  appliedRevision: null,
                  attemptRevision: null,
                  attemptToken: null,
                  id: null,
                  state: "pending",
                },
                event.revision,
                token,
              );
              if (!fenceValid) break;
              continue;
            }
            if (observed.kind !== "success") continue;
            if (
              !(await persist(
                event.id,
                provider,
                {
                  appliedDestination:
                    observed.request?.destination ??
                    projection.appliedDestination,
                  appliedRevision: null,
                  attemptRevision: null,
                  attemptToken: null,
                  id: observed.id,
                  state: "pending",
                },
                event.revision,
                token,
              ))
            ) {
              fenceValid = false;
              continue;
            }
            event = assertClubEvent(await state.getEvent(eventId));
            projection = event[provider];
          }
          if (!projection.id) continue;
          const result = await callProvider(
            event,
            provider,
            token,
            "delete",
            projection.id,
          );
          if (!result) {
            fenceValid = false;
            break;
          }
          const absent =
            result.kind === "success" || result.kind === "not_found";
          fenceValid = await persist(
            event.id,
            provider,
            absent
              ? {
                  appliedDestination: null,
                  appliedRevision: null,
                  attemptRevision: null,
                  attemptToken: null,
                  id: null,
                  state: "pending",
                }
              : {
                  ...projection,
                  attemptRevision:
                    result.kind === "unknown" ? event.revision : null,
                  attemptToken: result.kind === "unknown" ? token : null,
                  state: result.kind === "unknown" ? "unknown" : "error",
                },
            event.revision,
            token,
          );
          if (!fenceValid) break;
        }
        event = assertClubEvent(await state.getEvent(eventId));
        const discordAbsent =
          !event.discord.id &&
          (event.discord.state !== "unknown" ||
            Boolean(event.discordNoProjectionAcknowledgedAt));
        const googleAbsent =
          !event.google.id && event.google.state !== "unknown";
        const ownsLease =
          fenceValid &&
          (await state.ownsSyncLease(eventId, event.revision, token));
        if (discordAbsent && googleAbsent && ownsLease) {
          const deleted = await state.deleteEvent(eventId, {
            revision: event.revision,
            token,
          });
          outcome = {
            eventId,
            status: deleted ? "deleted" : "syncing",
          };
        } else {
          outcome = {
            eventId,
            status: fenceValid ? "needs_attention" : "syncing",
          };
        }
      } catch (error) {
        deletionFailure = error;
        outcome = { eventId, status: "syncing" };
      } finally {
        await state.releaseSyncLease(eventId, token);
      }
      await attemptAudit({ action: "delete", actorId, eventId });
      if (deletionFailure !== undefined) {
        if (deletionFailure instanceof Error) throw deletionFailure;
        throw new Error("Event deletion failed.");
      }
      return outcome;
    },

    async listDiscordRepairCandidates(eventId: string) {
      assertClubEvent(await state.getEvent(eventId));
      return discord.list();
    },

    async resolveDiscordProjection(
      eventId: string,
      resolution:
        | {
            actorId: string;
            candidateId: string;
            mode: "link_existing";
          }
        | {
            actorId: string;
            candidateSnapshot: readonly LiveProjection[];
            mode: "confirm_no_projection";
            phrase: string;
          },
    ) {
      const event = assertClubEvent(await state.getEvent(eventId));
      if (resolution.mode === "confirm_no_projection") {
        if (
          resolution.phrase !==
          "I understand an unlinked Discord event may remain"
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Type the confirmation phrase exactly.",
          });
        }
        event.discordNoProjectionAcknowledgedAt = clock();
        event.discordNoProjectionAcknowledgedBy = resolution.actorId;
        if (!(await state.saveEvent(event))) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "The event changed while Discord was being resolved.",
          });
        }
        await attemptAudit({
          action: "resolve_discord",
          actorId: resolution.actorId,
          eventId,
        });
        return { acknowledged: true };
      }

      const token = tokenFactory();
      const now = clock();
      if (
        !(await state.acquireSyncLease({
          eventId,
          expiresAt: new Date(now.getTime() + config.leaseDurationMs),
          now,
          revision: event.revision,
          token,
        }))
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This event is already synchronizing.",
        });
      }

      let linked = false;
      let linkFailure: unknown;
      try {
        const current = assertClubEvent(await state.getEvent(eventId));
        if (
          current.discord.id &&
          (current.discord.attemptToken || current.discord.state === "unknown")
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "The prior Discord update is ambiguous and cannot be retried yet.",
          });
        }
        const candidate = await discord.get(resolution.candidateId);
        if (candidate.kind !== "success") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "That Discord event is no longer available.",
          });
        }
        const request = projectionRequest(
          current,
          "discord",
          config.googleCalendars,
        );
        if (candidate.request?.entityType !== request.entityType) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "That Discord event type no longer matches this Blade event.",
          });
        }
        const updated = await callProvider(
          current,
          "discord",
          token,
          "update",
          resolution.candidateId,
        );
        if (!updated) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "The event changed while Discord was being linked.",
          });
        }
        const projection = resultProjection(
          current.discord,
          updated,
          request,
          token,
        );
        if (
          !(await persist(
            current.id,
            "discord",
            projection,
            current.revision,
            token,
          ))
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "The event changed while Discord was being linked.",
          });
        }
        if (updated.kind !== "success") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "That Discord event could not be linked.",
          });
        }
        linked = true;
      } catch (error) {
        linkFailure = error;
      } finally {
        await state.releaseSyncLease(eventId, token);
      }
      await attemptAudit({
        action: "resolve_discord",
        actorId: resolution.actorId,
        eventId,
      });
      if (linkFailure !== undefined) {
        if (linkFailure instanceof Error) throw linkFailure;
        throw new Error("Discord linking failed.");
      }
      if (linked) {
        await sync(eventId, { actorId: resolution.actorId });
      }
      return { acknowledged: false, linkedId: resolution.candidateId };
    },

    sync,

    async updateLegacy(
      eventId: string,
      {
        actorId,
        patch,
      }: { actorId: string; patch: Partial<EventWorkflowRecord> },
    ) {
      const event = assertClubEvent(await state.getEvent(eventId));
      if (!event.legacy) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Only Legacy events use local-only updates.",
        });
      }
      const updated = { ...event, ...patch, id: event.id };
      if (!(await state.saveEvent(updated))) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "The legacy event changed. Reload and try again.",
        });
      }
      await attemptAudit({ action: "update_legacy", actorId, eventId });
      return { eventId, status: "legacy" as const };
    },
  };
}
