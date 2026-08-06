import { describe, expect, it } from "vitest";

import type { HackathonEventDraft } from "~/app/_components/admin/hackathon-events/hackathon-event-form-dialog";
import { buildHackathonEventFormValue } from "~/app/_components/admin/hackathon-events/hackathon-event-form-dialog";
import {
  canDeleteHackathonEvent,
  editableHackathonEventPayload,
  hackathonCalendarWindow,
} from "~/app/_components/admin/hackathon-events/hackathon-events-workspace";

const BASE_DRAFT: HackathonEventDraft = {
  creationKey: "00000000-0000-4000-8000-000000000001",
  description: "Welcome every hacker.",
  end: "2026-08-05T11:00",
  location: "Atrium",
  name: "Hackathon Check-in",
  points: "",
  purpose: "primary_check_in",
  start: "2026-08-05T09:00",
  tagId: "00000000-0000-4000-8000-000000000002",
};

describe("hackathon event form payload", () => {
  it("keeps purpose explicit and uses the tag default when points are blank", () => {
    expect(buildHackathonEventFormValue(BASE_DRAFT)).toMatchObject({
      end: "2026-08-05T11:00:00-04:00",
      internalTarget: { internal: false },
      purpose: "primary_check_in",
      start: "2026-08-05T09:00:00-04:00",
    });
    expect(buildHackathonEventFormValue(BASE_DRAFT)).not.toHaveProperty(
      "pointsOverride",
    );
  });

  it("keeps hackathon events public and preserves deliberate zero points", () => {
    expect(
      buildHackathonEventFormValue({
        ...BASE_DRAFT,
        points: "0",
        purpose: "event",
      }),
    ).toMatchObject({
      internalTarget: { internal: false },
      pointsOverride: 0,
      purpose: "event",
    });
  });

  it("removes the creation key from strict update payloads", () => {
    const value = buildHackathonEventFormValue(BASE_DRAFT);
    expect(editableHackathonEventPayload(value)).not.toHaveProperty(
      "creationKey",
    );
  });

  it("ignores malformed, reversed, and oversized calendar URL windows", () => {
    expect(hackathonCalendarWindow("bogus", "also-bogus")).toBeNull();
    expect(
      hackathonCalendarWindow(
        "2026-08-06T04:00:00.000Z",
        "2026-08-05T04:00:00.000Z",
      ),
    ).toBeNull();
    expect(
      hackathonCalendarWindow(
        "2026-01-01T05:00:00.000Z",
        "2026-08-05T04:00:00.000Z",
      ),
    ).toBeNull();
  });

  it("derives calendar query bounds and its initial date from one validated window", () => {
    expect(
      hackathonCalendarWindow(
        "2026-08-05T04:00:00.000Z",
        "2026-08-06T04:00:00.000Z",
      ),
    ).toEqual({
      calendarEnd: "2026-08-06T00:00:00-04:00",
      calendarStart: "2026-08-05T00:00:00-04:00",
      initialDate: "2026-08-05T16:00:00.000Z",
    });
  });

  it("keeps deletion unavailable once retained attendance exists", () => {
    expect(canDeleteHackathonEvent(0)).toBe(true);
    expect(canDeleteHackathonEvent(1)).toBe(false);
  });
});
