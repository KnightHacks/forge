import { describe, expect, it, vi } from "vitest";

import { createEventSyncOrchestrator } from "../../utils/events/orchestration";
import { createTestClock } from "../support/events/fake-clock";
import {
  deferredProviderResult,
  FakeEventProviderGateway,
} from "../support/events/fake-provider-gateways";
import {
  EVENT_IDS,
  eventRecord,
  NOW,
  USER_IDS,
} from "../support/events/fixtures";
import { InMemoryEventWorkflowState } from "../support/events/in-memory-event-state";

function pendingEvent(overrides: Parameters<typeof eventRecord>[0] = {}) {
  return eventRecord({
    discord: {
      appliedDestination: null,
      appliedRevision: null,
      attemptToken: null,
      id: null,
      state: "pending",
    },
    google: {
      appliedDestination: null,
      appliedRevision: null,
      attemptToken: null,
      id: null,
      state: "pending",
    },
    publishedAt: null,
    synchronizedVisibility: null,
    ...overrides,
  });
}

function setup(events = [pendingEvent()]) {
  const audit = vi.fn().mockResolvedValue(undefined);
  const clock = createTestClock(NOW);
  const discord = new FakeEventProviderGateway();
  const google = new FakeEventProviderGateway();
  const state = new InMemoryEventWorkflowState(events);
  let token = 0;
  const orchestrator = createEventSyncOrchestrator({
    audit,
    clock: clock.now,
    config: {
      googleCalendars: {
        internal: "internal-calendar",
        public: "public-calendar",
      },
      leaseDurationMs: 30_000,
    },
    discord,
    google,
    state,
    tokenFactory: () => `sync-token-${++token}`,
  });
  return { audit, clock, discord, google, orchestrator, state };
}

describe("event provider orchestration", () => {
  it("[TC-009] deduplicates concurrent same-key creation and conflicts on changed payload", async () => {
    const first = pendingEvent({
      id: "00000000-0000-4000-8000-000000000161",
    });
    const samePayload = pendingEvent({
      id: "00000000-0000-4000-8000-000000000162",
    });
    const { discord, google, orchestrator, state } = setup([]);

    const results = await Promise.all([
      orchestrator.create(first, { actorId: USER_IDS.operator }),
      orchestrator.create(samePayload, { actorId: USER_IDS.operator }),
    ]);

    expect(new Set(results.map(({ eventId }) => eventId))).toEqual(
      new Set([first.id]),
    );
    expect(state.events.size).toBe(1);
    expect(
      discord.calls.filter(({ operation }) => operation === "create"),
    ).toHaveLength(1);
    expect(
      google.calls.filter(({ operation }) => operation === "create"),
    ).toHaveLength(1);

    await expect(
      orchestrator.create(
        pendingEvent({
          id: "00000000-0000-4000-8000-000000000163",
          name: "Changed payload",
        }),
        { actorId: USER_IDS.operator },
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(state.events.size).toBe(1);
  });

  it("[TC-009] publishes only after both initial projections are durable", async () => {
    const { discord, google, orchestrator, state } = setup();

    const result = await orchestrator.sync(EVENT_IDS.public, {
      actorId: USER_IDS.operator,
    });
    const stored = await state.getEvent(EVENT_IDS.public);

    expect(result.status).toBe("published");
    expect(stored).toMatchObject({
      discord: {
        appliedDestination: "external",
        appliedRevision: 1,
        id: expect.any(String),
        state: "synced",
      },
      google: {
        appliedDestination: "public-calendar",
        appliedRevision: 1,
        id: expect.any(String),
        state: "synced",
      },
      publishedAt: NOW,
      synchronizedVisibility: {
        audience: "public",
        internal: false,
        roleIds: [],
      },
    });
    expect(discord.calls).toHaveLength(1);
    expect(discord.calls[0]).toMatchObject({
      operation: "create",
      request: {
        destination: "external",
        entityType: "external",
        eventId: EVENT_IDS.public,
        location: "ENG2 102",
        points: 25,
        title: "[Workshop] TypeScript Workshop",
      },
    });
    expect(google.calls).toHaveLength(1);
    expect(google.calls[0]).toMatchObject({
      operation: "create",
      request: {
        destination: "public-calendar",
        privateProperties: {
          bladeCreationKey: "create-key-1",
          bladeEventId: EVENT_IDS.public,
        },
      },
    });
    expect(state.attempts.map(({ provider }) => provider)).toEqual([
      "discord",
      "google",
    ]);
  });

  it("[TC-010] maps Internal voice and stage channels to the internal destinations", async () => {
    const voice = pendingEvent({
      discordChannel: { id: "voice-channel", type: "voice" },
      id: EVENT_IDS.internal,
      internal: true,
    });
    const stage = pendingEvent({
      discordChannel: { id: "stage-channel", type: "stage" },
      id: "00000000-0000-4000-8000-000000000141",
      internal: true,
    });
    const { discord, google, orchestrator } = setup([voice, stage]);

    await orchestrator.sync(voice.id, { actorId: USER_IDS.operator });
    await orchestrator.sync(stage.id, { actorId: USER_IDS.operator });

    expect(discord.calls[0]).toMatchObject({
      request: {
        channelId: "voice-channel",
        destination: "voice:voice-channel",
        entityType: "voice",
      },
    });
    expect(discord.calls[1]).toMatchObject({
      request: {
        channelId: "stage-channel",
        destination: "stage:stage-channel",
        entityType: "stage",
      },
    });
    expect(google.calls.map((call) => call.request?.destination)).toEqual([
      "internal-calendar",
      "internal-calendar",
    ]);
  });

  it("[TC-012] retains partial creation and repairs only the failed provider", async () => {
    const { discord, google, orchestrator, state } = setup();
    google.enqueue("create", {
      kind: "transient_error",
      message: "calendar unavailable",
    });

    await expect(
      orchestrator.sync(EVENT_IDS.public, { actorId: USER_IDS.operator }),
    ).resolves.toMatchObject({ status: "needs_attention" });
    expect(await state.getEvent(EVENT_IDS.public)).toMatchObject({
      discord: { id: expect.any(String), state: "synced" },
      google: { id: null, state: "error" },
      publishedAt: null,
    });

    discord.resetCalls();
    google.resetCalls();
    await expect(
      orchestrator.sync(EVENT_IDS.public, { actorId: USER_IDS.operator }),
    ).resolves.toMatchObject({ status: "published" });

    expect(discord.calls).toEqual([]);
    expect(google.calls).toHaveLength(1);
    expect(google.calls[0]?.operation).toBe("create");
    expect(await state.getEvent(EVENT_IDS.public)).toMatchObject({
      google: { id: expect.any(String), state: "synced" },
      publishedAt: NOW,
    });
  });

  it("[TC-013] adopts an ambiguous Google create only by exact private identity", async () => {
    const { google, orchestrator, state } = setup();
    google.enqueue("create", {
      acceptedId: "accepted-google-id",
      kind: "unknown",
      message: "timeout after acceptance",
    });

    await orchestrator.sync(EVENT_IDS.public, { actorId: USER_IDS.operator });
    expect(await state.getEvent(EVENT_IDS.public)).toMatchObject({
      google: { id: null, state: "unknown" },
    });

    google.resetCalls();
    await orchestrator.sync(EVENT_IDS.public, { actorId: USER_IDS.operator });

    expect(google.calls.map(({ operation }) => operation)).toEqual(["list"]);
    expect(await state.getEvent(EVENT_IDS.public)).toMatchObject({
      google: { id: "accepted-google-id", state: "synced" },
    });
  });

  it("[TC-013] leaves ambiguous Discord creation Unknown until explicit reviewed resolution", async () => {
    const { discord, orchestrator, state } = setup();
    discord.enqueue("create", {
      acceptedId: "accepted-discord-id",
      kind: "unknown",
      message: "timeout after acceptance",
    });

    await orchestrator.sync(EVENT_IDS.public, { actorId: USER_IDS.operator });
    discord.resetCalls();
    await orchestrator.sync(EVENT_IDS.public, { actorId: USER_IDS.operator });

    expect(discord.calls).toEqual([]);
    expect(await state.getEvent(EVENT_IDS.public)).toMatchObject({
      discord: { id: null, state: "unknown" },
    });

    const candidates = await orchestrator.listDiscordRepairCandidates(
      EVENT_IDS.public,
    );
    expect(candidates).toEqual([
      expect.objectContaining({ id: "accepted-discord-id" }),
    ]);
    await orchestrator.resolveDiscordProjection(EVENT_IDS.public, {
      actorId: USER_IDS.operator,
      candidateId: "accepted-discord-id",
      mode: "link_existing",
    });

    expect(discord.calls.map(({ operation }) => operation)).toEqual([
      "list",
      "get",
      "update",
    ]);
    expect(await state.getEvent(EVENT_IDS.public)).toMatchObject({
      discord: { id: "accepted-discord-id", state: "synced" },
    });
  });

  it("[TC-013] fences a late completion after lease ownership changes", async () => {
    const { promise, resolve } = deferredProviderResult();
    const { clock, discord, orchestrator, state } = setup();
    discord.enqueue("create", promise);

    const oldOwner = orchestrator.sync(EVENT_IDS.public, {
      actorId: USER_IDS.operator,
    });
    await vi.waitFor(() => expect(state.attempts).toHaveLength(1));
    clock.advance(31_000);
    state.replaceLease(
      EVENT_IDS.public,
      1,
      "replacement-owner",
      new Date(clock.now().getTime() + 30_000),
    );

    resolve({ id: "late-discord-id", kind: "success" });
    await oldOwner;

    expect(await state.getEvent(EVENT_IDS.public)).toMatchObject({
      discord: { id: null, state: "pending" },
    });
    expect(
      discord.calls.filter(({ operation }) => operation === "create"),
    ).toHaveLength(1);
  });

  it("[TC-014] uses delete-then-create replacement for Internal destination changes", async () => {
    const changed = eventRecord({
      discord: {
        appliedDestination: "external",
        appliedRevision: 1,
        id: "old-discord-id",
        state: "pending",
      },
      discordChannel: { id: "voice-channel", type: "voice" },
      google: {
        appliedDestination: "public-calendar",
        appliedRevision: 1,
        id: "old-google-id",
        state: "pending",
      },
      internal: true,
      revision: 2,
      synchronizedVisibility: {
        audience: "public",
        internal: false,
        roleIds: [],
      },
    });
    const { discord, google, orchestrator, state } = setup([changed]);
    discord.seed({
      id: "old-discord-id",
      request: {
        channelId: null,
        creationKey: "create-key-1",
        description: "old",
        destination: "external",
        endAt: changed.endAt,
        entityType: "external",
        eventId: changed.id,
        location: changed.location,
        points: changed.points,
        revision: 1,
        startAt: changed.startAt,
        title: "old",
      },
    });
    google.seed({
      id: "old-google-id",
      request: {
        channelId: null,
        creationKey: "create-key-1",
        description: "old",
        destination: "public-calendar",
        endAt: changed.endAt,
        entityType: "external",
        eventId: changed.id,
        location: changed.location,
        points: changed.points,
        revision: 1,
        startAt: changed.startAt,
        title: "old",
      },
    });

    await orchestrator.sync(changed.id, { actorId: USER_IDS.operator });

    expect(discord.calls.map(({ operation }) => operation)).toEqual([
      "delete",
      "create",
    ]);
    expect(google.calls.map(({ operation }) => operation)).toEqual([
      "delete",
      "create",
    ]);
    expect(await state.getEvent(changed.id)).toMatchObject({
      discord: {
        appliedDestination: "voice:voice-channel",
        appliedRevision: 2,
        state: "synced",
      },
      google: {
        appliedDestination: "internal-calendar",
        appliedRevision: 2,
        state: "synced",
      },
    });
  });

  it("[TC-014] patches same-destination projections in place", async () => {
    const changed = eventRecord({
      discord: {
        appliedDestination: "external",
        appliedRevision: 1,
        id: "existing-discord-id",
        state: "pending",
      },
      google: {
        appliedDestination: "public-calendar",
        appliedRevision: 1,
        id: "existing-google-id",
        state: "pending",
      },
      name: "Updated Workshop",
      revision: 2,
    });
    const { discord, google, orchestrator } = setup([changed]);
    const oldRequest = {
      channelId: null,
      creationKey: "create-key-1",
      description: "old",
      destination: "external",
      endAt: changed.endAt,
      entityType: "external" as const,
      eventId: changed.id,
      location: changed.location,
      points: changed.points,
      revision: 1,
      startAt: changed.startAt,
      title: "old",
    };
    discord.seed({ id: "existing-discord-id", request: oldRequest });
    google.seed({
      id: "existing-google-id",
      request: { ...oldRequest, destination: "public-calendar" },
    });

    await orchestrator.sync(changed.id, { actorId: USER_IDS.operator });

    expect(discord.calls.map(({ operation }) => operation)).toEqual(["update"]);
    expect(google.calls.map(({ operation }) => operation)).toEqual(["update"]);
    expect(discord.live.get("existing-discord-id")?.request).toMatchObject({
      revision: 2,
      title: "[Workshop] Updated Workshop",
    });
  });

  it("[TC-014] never creates the target projection when old deletion fails", async () => {
    const changed = eventRecord({
      discord: {
        appliedDestination: "external",
        appliedRevision: 1,
        id: "old-discord-id",
        state: "pending",
      },
      discordChannel: { id: "voice-channel", type: "voice" },
      internal: true,
      revision: 2,
    });
    const { discord, orchestrator, state } = setup([changed]);
    discord.enqueue("delete", {
      kind: "transient_error",
      message: "cannot delete old projection",
    });

    await orchestrator.sync(changed.id, { actorId: USER_IDS.operator });

    expect(discord.calls.map(({ operation }) => operation)).toEqual(["delete"]);
    expect(await state.getEvent(changed.id)).toMatchObject({
      discord: { id: "old-discord-id", state: "error" },
    });
  });

  it("[TC-014] leaves a repairable missing projection when target creation fails", async () => {
    const changed = eventRecord({
      discord: {
        appliedDestination: "external",
        appliedRevision: 1,
        id: "old-discord-id",
        state: "pending",
      },
      discordChannel: { id: "voice-channel", type: "voice" },
      internal: true,
      revision: 2,
    });
    const { discord, orchestrator, state } = setup([changed]);
    discord.enqueue("create", {
      kind: "transient_error",
      message: "cannot create target projection",
    });

    await orchestrator.sync(changed.id, { actorId: USER_IDS.operator });

    expect(discord.calls.map(({ operation }) => operation)).toEqual([
      "delete",
      "create",
    ]);
    expect(await state.getEvent(changed.id)).toMatchObject({
      discord: { id: null, state: "error" },
    });
  });

  it("[TC-025] refuses deletion before provider cleanup when attendance exists", async () => {
    const published = eventRecord({ attendanceCount: 1 });
    const { discord, google, orchestrator, state } = setup([published]);
    state.setAttendanceCount(published.id, 1);

    await expect(
      orchestrator.delete(published.id, { actorId: USER_IDS.operator }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(discord.calls).toEqual([]);
    expect(google.calls).toEqual([]);
    expect(await state.getEvent(published.id)).not.toBeNull();
  });

  it("[TC-026, TC-027] treats Not found as deletion success and retains transient failures for retry", async () => {
    const published = eventRecord();
    const { discord, google, orchestrator, state } = setup([published]);
    discord.enqueue("delete", { kind: "not_found" });
    google.enqueue("delete", {
      kind: "transient_error",
      message: "calendar unavailable",
    });

    await expect(
      orchestrator.delete(published.id, { actorId: USER_IDS.operator }),
    ).resolves.toMatchObject({ status: "needs_attention" });
    expect(await state.getEvent(published.id)).toMatchObject({
      deletionIntentAt: NOW,
      discord: { id: null },
      google: { id: "google-event-1", state: "error" },
    });

    discord.resetCalls();
    google.resetCalls();
    await expect(
      orchestrator.delete(published.id, { actorId: USER_IDS.operator }),
    ).resolves.toMatchObject({ status: "deleted" });
    expect(discord.calls).toEqual([]);
    expect(google.calls.map(({ operation }) => operation)).toEqual(["delete"]);
    expect(await state.getEvent(published.id)).toBeNull();
  });

  it("[TC-029] edits Legacy events locally without provider synchronization", async () => {
    const legacy = eventRecord({
      id: EVENT_IDS.legacy,
      legacy: true,
      publishedAt: null,
      synchronizedVisibility: null,
    });
    const { discord, google, orchestrator, state } = setup([legacy]);

    await orchestrator.updateLegacy(legacy.id, {
      actorId: USER_IDS.operator,
      patch: { name: "Corrected historical name" },
    });

    expect(await state.getEvent(legacy.id)).toMatchObject({
      name: "Corrected historical name",
    });
    expect(discord.calls).toEqual([]);
    expect(google.calls).toEqual([]);
  });

  it("[TC-034] blocks deleting an Unknown no-ID Discord projection until explicit resolution", async () => {
    const unknown = eventRecord({
      discord: {
        appliedDestination: null,
        appliedRevision: null,
        attemptToken: "attempt-1",
        id: null,
        state: "unknown",
      },
    });
    const { orchestrator, state } = setup([unknown]);

    await expect(
      orchestrator.delete(unknown.id, { actorId: USER_IDS.operator }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await state.getEvent(unknown.id)).toMatchObject({
      deletionIntentAt: null,
    });

    const candidates = await orchestrator.listDiscordRepairCandidates(
      unknown.id,
    );
    await expect(
      orchestrator.resolveDiscordProjection(unknown.id, {
        actorId: USER_IDS.operator,
        candidateSnapshot: candidates,
        mode: "confirm_no_projection",
        phrase: "wrong phrase",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      orchestrator.resolveDiscordProjection(unknown.id, {
        actorId: USER_IDS.operator,
        candidateSnapshot: candidates,
        mode: "confirm_no_projection",
        phrase: "I understand an unlinked Discord event may remain",
      }),
    ).resolves.toMatchObject({ acknowledged: true });
  });

  it("[TC-NEG-012] does not roll back product state when audit delivery fails", async () => {
    const fixture = setup();
    fixture.audit.mockRejectedValue(new Error("audit unavailable"));

    await expect(
      fixture.orchestrator.sync(EVENT_IDS.public, {
        actorId: USER_IDS.operator,
      }),
    ).resolves.toMatchObject({ status: "published" });
    expect(await fixture.state.getEvent(EVENT_IDS.public)).toMatchObject({
      publishedAt: NOW,
    });
  });
});
