import { describe, expect, it, vi } from "vitest";

import { EVENTS } from "@forge/consts";

import { createEventSyncOrchestrator } from "../../utils/events/orchestration";
import {
  createGoogleEventGateway,
  eventGoogleCalendars,
} from "../../utils/events/provider-gateways";
import { createTestClock } from "../support/events/fake-clock";
import { FakeEventProviderGateway } from "../support/events/fake-provider-gateways";
import { eventRecord, NOW, USER_IDS } from "../support/events/fixtures";
import { InMemoryEventWorkflowState } from "../support/events/in-memory-event-state";

const googleEvents = vi.hoisted(() => ({
  list: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@forge/utils/google", () => ({
  calendar: { events: googleEvents },
}));

describe("Google event gateway", () => {
  it("deduplicates identical configured calendars before ambiguous-create adoption", async () => {
    expect(EVENTS.GOOGLE_CALENDAR_ID).toBe(EVENTS.DEV_GOOGLE_CALENDAR_ID);
    const event = eventRecord({
      google: {
        appliedDestination: null,
        appliedRevision: null,
        attemptRevision: 1,
        attemptToken: "00000000-0000-4000-8000-000000000901",
        id: null,
        state: "unknown",
      },
      publishedAt: null,
      synchronizedVisibility: null,
    });
    const recoveredId = "recovered-google-event";
    googleEvents.list.mockResolvedValue({
      data: {
        items: [
          {
            description: `${event.description}\n\nLocation: ${event.location}\nPoints: ${event.points}`,
            end: { dateTime: event.endAt.toISOString() },
            extendedProperties: {
              private: {
                bladeCreationKey: event.creationKey,
                bladeEventId: event.id,
              },
            },
            id: recoveredId,
            location: event.location,
            start: { dateTime: event.startAt.toISOString() },
            summary: `[${event.tag}] ${event.name}`,
          },
        ],
      },
    });
    googleEvents.update.mockResolvedValue({ data: { id: recoveredId } });

    const state = new InMemoryEventWorkflowState([event]);
    const orchestrator = createEventSyncOrchestrator({
      audit: vi.fn().mockResolvedValue(undefined),
      clock: createTestClock(NOW).now,
      config: {
        googleCalendars: eventGoogleCalendars(),
        leaseDurationMs: 30_000,
      },
      discord: new FakeEventProviderGateway(),
      google: createGoogleEventGateway(),
      state,
      tokenFactory: () => "00000000-0000-4000-8000-000000000902",
    });

    await expect(
      orchestrator.sync(event.id, { actorId: USER_IDS.operator }),
    ).resolves.toMatchObject({ status: "published" });

    expect(googleEvents.list).toHaveBeenCalledTimes(1);
    expect(googleEvents.update).toHaveBeenCalledTimes(1);
    expect(await state.getEvent(event.id)).toMatchObject({
      google: {
        attemptRevision: null,
        attemptToken: null,
        id: recoveredId,
        state: "synced",
      },
    });
  });
});
