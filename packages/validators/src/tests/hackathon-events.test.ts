import { describe, expect, it } from "vitest";

import {
  hackathonCheckInHistorySchema,
  hackathonEventAdminQuerySchema,
  hackathonEventCheckInSchema,
  hackathonEventCreateSchema,
  hackathonEventDiscordConfigSchema,
  hackathonEventDiscordResolutionSchema,
  hackathonEventQrPayloadSchema,
  hackathonEventTagImportSchema,
  hackathonEventTagUpdateSchema,
  parseHackathonQrPayload,
} from "../hackathon-events";

const HACKATHON_ID = "00000000-0000-4000-8000-000000000001";
const EVENT_ID = "00000000-0000-4000-8000-000000000002";
const ATTENDEE_ID = "00000000-0000-4000-8000-000000000003";

describe("hackathon event contracts", () => {
  it("TC-API-001 accepts an explicitly scoped primary event", () => {
    expect(
      hackathonEventCreateSchema.parse({
        creationKey: "00000000-0000-4000-8000-000000000004",
        description: "Admit confirmed hackers.",
        end: "2026-09-12T12:00:00-04:00",
        hackathonId: HACKATHON_ID,
        internalTarget: { internal: false },
        location: "Atrium",
        name: "Hackathon Check-in",
        purpose: "primary_check_in",
        start: "2026-09-12T08:00:00-04:00",
        tagId: "00000000-0000-4000-8000-000000000005",
      }),
    ).toMatchObject({ hackathonId: HACKATHON_ID, purpose: "primary_check_in" });
  });

  it("TC-API-002 rejects Club audience and browser-supplied points", () => {
    expect(() =>
      hackathonEventCreateSchema.parse({
        audience: { type: "public" },
        creationKey: "00000000-0000-4000-8000-000000000004",
        description: "Workshop",
        end: "2026-09-12T12:00:00-04:00",
        hackathonId: HACKATHON_ID,
        internalTarget: { internal: false },
        location: "Atrium",
        name: "Workshop",
        points: 999,
        purpose: "event",
        start: "2026-09-12T11:00:00-04:00",
        tagId: "00000000-0000-4000-8000-000000000005",
      }),
    ).toThrow();
  });

  it("TC-API-003 keeps manual check-in idempotent by excluding repeat input", () => {
    expect(
      hackathonEventCheckInSchema.parse({
        attendeeId: ATTENDEE_ID,
        calledClassId: null,
        eventId: EVENT_ID,
        hackathonId: HACKATHON_ID,
        source: "manual",
      }),
    ).toMatchObject({ source: "manual" });
    expect(() =>
      hackathonEventCheckInSchema.parse({
        allowRepeat: true,
        attendeeId: ATTENDEE_ID,
        eventId: EVENT_ID,
        hackathonId: HACKATHON_ID,
        source: "manual",
      }),
    ).toThrow();
  });

  it("TC-API-004 parses only account UUID QR payloads", () => {
    expect(hackathonEventQrPayloadSchema.parse("not-a-qr")).toBe("not-a-qr");
    expect(parseHackathonQrPayload(`user:${ATTENDEE_ID}`)).toEqual({
      userId: ATTENDEE_ID,
    });
    expect(parseHackathonQrPayload("not-a-qr")).toBeNull();
  });

  it("TC-API-005 validates optional Discord configuration as snowflakes", () => {
    expect(
      hackathonEventDiscordConfigSchema.parse({
        eventAnnouncementChannelId: "123456789012345678",
        generalHackerDiscordRoleId: "223456789012345678",
        hackathonId: HACKATHON_ID,
      }),
    ).toMatchObject({ hackathonId: HACKATHON_ID });
    expect(() =>
      hackathonEventDiscordConfigSchema.parse({
        eventAnnouncementChannelId: "general",
        generalHackerDiscordRoleId: "hackers",
        hackathonId: HACKATHON_ID,
      }),
    ).toThrow();
  });

  it("requires hackathon scope for every Discord ambiguity resolution", () => {
    expect(
      hackathonEventDiscordResolutionSchema.parse({
        candidateId: "123456789012345678",
        eventId: EVENT_ID,
        hackathonId: HACKATHON_ID,
        mode: "link-existing",
      }),
    ).toMatchObject({ hackathonId: HACKATHON_ID, mode: "link-existing" });
    expect(() =>
      hackathonEventDiscordResolutionSchema.parse({
        candidateId: "123456789012345678",
        eventId: EVENT_ID,
        mode: "link-existing",
      }),
    ).toThrow();
  });

  it("TC-API-006 requires at least one tag update", () => {
    expect(() =>
      hackathonEventTagUpdateSchema.parse({
        hackathonId: HACKATHON_ID,
        tagId: EVENT_ID,
      }),
    ).toThrow();
  });

  it("validates paginated list and bounded calendar query state", () => {
    expect(
      hackathonEventAdminQuerySchema.parse({
        hackathonId: HACKATHON_ID,
        page: 3,
        pageSize: 50,
        sortDirection: "desc",
        sortField: "attendance",
        tags: ["Workshop", "Food"],
        timing: "past",
        view: "list",
      }),
    ).toMatchObject({ page: 3, pageSize: 50, timing: "past" });
    expect(() =>
      hackathonEventAdminQuerySchema.parse({
        calendarStart: "2026-09-12T08:00:00-04:00",
        hackathonId: HACKATHON_ID,
        view: "calendar",
      }),
    ).toThrow();
  });

  it("keeps tag import server-authored and strictly hackathon scoped", () => {
    expect(
      hackathonEventTagImportSchema.parse({ hackathonId: HACKATHON_ID }),
    ).toEqual({ hackathonId: HACKATHON_ID });
    expect(() =>
      hackathonEventTagImportSchema.parse({
        hackathonId: HACKATHON_ID,
        tags: [{ name: "Client controlled" }],
      }),
    ).toThrow();
  });

  it("accepts the forward direction added by tRPC infinite queries", () => {
    expect(
      hackathonCheckInHistorySchema.parse({
        direction: "forward",
        hackathonId: HACKATHON_ID,
        limit: 25,
      }),
    ).toMatchObject({ direction: "forward" });
    expect(() =>
      hackathonCheckInHistorySchema.parse({
        direction: "backward",
        hackathonId: HACKATHON_ID,
      }),
    ).toThrow();
  });
});
