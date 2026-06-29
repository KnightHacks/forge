import { describe, expect, it, vi } from "vitest";

import type { TestEventTagRecord } from "../support/events/in-memory-tag-state";
import { getEventRoleDependencies } from "../../utils/events/role-dependencies";
import { createEventTagService } from "../../utils/events/tags";
import { createTestClock } from "../support/events/fake-clock";
import {
  EVENT_IDS,
  eventRecord,
  NOW,
  ROLE_IDS,
  TAG_IDS,
  USER_IDS,
} from "../support/events/fixtures";
import { InMemoryEventTagState } from "../support/events/in-memory-tag-state";

function tagRecord(
  overrides: Partial<TestEventTagRecord> = {},
): TestEventTagRecord {
  return {
    active: true,
    color: "#7c3aed",
    createdAt: NOW,
    defaultPoints: 25,
    id: TAG_IDS.workshop,
    name: "Workshop",
    normalizedName: "workshop",
    updatedAt: NOW,
    ...overrides,
  };
}

function setup(tags = [tagRecord()]) {
  const audit = vi.fn().mockResolvedValue(undefined);
  const clock = createTestClock(NOW);
  const state = new InMemoryEventTagState(tags);
  let id = 0;
  const service = createEventTagService({
    audit,
    clock: clock.now,
    idFactory: () =>
      `00000000-0000-4000-8000-${String(++id).padStart(12, "8")}`,
    state,
  });
  return { audit, clock, service, state };
}

describe("configurable event tags", () => {
  it("[TC-016] creates, updates, and archives tags using normalized unique names", async () => {
    const { service } = setup([]);

    const created = await service.create({
      actorId: USER_IDS.operator,
      color: "#2563EB",
      defaultPoints: 0,
      name: "  Career   Prep  ",
    });
    expect(created).toMatchObject({
      active: true,
      color: "#2563eb",
      defaultPoints: 0,
      name: "Career Prep",
      normalizedName: "career prep",
    });

    await expect(
      service.create({
        actorId: USER_IDS.operator,
        color: "#ffffff",
        defaultPoints: 10,
        name: "career prep",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    await expect(
      service.update({
        actorId: USER_IDS.operator,
        color: "#16a34a",
        defaultPoints: 40,
        name: "Career Studio",
        tagId: created.id,
      }),
    ).resolves.toMatchObject({
      color: "#16a34a",
      defaultPoints: 40,
      name: "Career Studio",
    });
    await expect(
      service.archive({ actorId: USER_IDS.operator, tagId: created.id }),
    ).resolves.toMatchObject({ active: false });
  });

  it("[TC-017] resolves immutable tag/color/point snapshots with zero override support", async () => {
    const { service } = setup();

    const defaultSnapshot = await service.resolveActiveSnapshot({
      pointsOverride: null,
      tagId: TAG_IDS.workshop,
    });
    const overrideSnapshot = await service.resolveActiveSnapshot({
      pointsOverride: 0,
      tagId: TAG_IDS.workshop,
    });
    expect(defaultSnapshot).toEqual({
      color: "#7c3aed",
      points: 25,
      tag: "Workshop",
    });
    expect(overrideSnapshot).toEqual({
      color: "#7c3aed",
      points: 0,
      tag: "Workshop",
    });

    await service.update({
      actorId: USER_IDS.operator,
      color: "#16a34a",
      defaultPoints: 50,
      name: "Hands-on Workshop",
      tagId: TAG_IDS.workshop,
    });
    expect(defaultSnapshot).toEqual({
      color: "#7c3aed",
      points: 25,
      tag: "Workshop",
    });
  });

  it("merges partial tag updates from the row locked current value", async () => {
    const { service } = setup();

    await service.update({
      actorId: USER_IDS.operator,
      color: "#16a34a",
      tagId: TAG_IDS.workshop,
    });
    await expect(
      service.update({
        actorId: USER_IDS.operator,
        name: "Workshop Lab",
        tagId: TAG_IDS.workshop,
      }),
    ).resolves.toMatchObject({
      color: "#16a34a",
      defaultPoints: 25,
      name: "Workshop Lab",
    });
  });

  it("[TC-NEG-006] rejects missing and archived tags before an event snapshot", async () => {
    const archived = tagRecord({ active: false });
    const { service } = setup([archived]);

    await expect(
      service.resolveActiveSnapshot({
        pointsOverride: null,
        tagId: archived.id,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      service.resolveActiveSnapshot({
        pointsOverride: null,
        tagId: "00000000-0000-4000-8000-000000000599",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("[TC-NEG-012] does not roll back a tag mutation when audit transport fails", async () => {
    const { audit, service, state } = setup([]);
    audit.mockRejectedValue(new Error("audit unavailable"));

    const created = await service.create({
      actorId: USER_IDS.operator,
      color: "#2563eb",
      defaultPoints: 10,
      name: "Career",
    });

    expect(await state.getTag(created.id)).toMatchObject({ name: "Career" });
    expect(JSON.stringify(audit.mock.calls)).not.toContain("@example.test");
  });
});

describe("event role dependencies", () => {
  it("[TC-031] reports current, historical, and hackathon Event references as unlink blockers", () => {
    const events = [
      eventRecord({
        audience: "roles",
        id: EVENT_IDS.role,
        roleIds: [ROLE_IDS.cosmetic],
      }),
      eventRecord({
        audience: "roles",
        endAt: new Date("2025-01-01T17:00:00.000Z"),
        id: EVENT_IDS.legacy,
        legacy: true,
        roleIds: [ROLE_IDS.cosmetic],
        startAt: new Date("2025-01-01T16:00:00.000Z"),
      }),
      eventRecord({
        audience: "roles",
        hackathonId: "00000000-0000-4000-8000-000000000701",
        id: EVENT_IDS.hackathon,
        roleIds: [ROLE_IDS.cosmetic],
      }),
      eventRecord({
        audience: "roles",
        id: "00000000-0000-4000-8000-000000000151",
        roleIds: [ROLE_IDS.other],
      }),
    ];

    expect(getEventRoleDependencies(events, ROLE_IDS.cosmetic)).toEqual({
      blockers: [
        {
          eventId: EVENT_IDS.role,
          kind: "club",
          label: "TypeScript Workshop",
          legacy: false,
        },
        {
          eventId: EVENT_IDS.legacy,
          kind: "club",
          label: "TypeScript Workshop",
          legacy: true,
        },
        {
          eventId: EVENT_IDS.hackathon,
          kind: "hackathon_maintenance",
          label: "TypeScript Workshop",
          legacy: false,
        },
      ],
      currentClub: 1,
      hackathonMaintenance: 1,
      historicalClub: 1,
      total: 3,
    });
    expect(
      getEventRoleDependencies(events, "00000000-0000-4000-8000-000000000499")
        .total,
    ).toBe(0);
  });
});
