import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  EventAdminDashboard,
  eventUpdateFeedback,
} from "~/app/_components/admin/events/event-admin-dashboard";
import { parseAdminEventSearchParams } from "~/app/_components/admin/events/params";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("~/trpc/react", () => ({
  api: (() => {
    const mutation = () => ({
      isPending: false,
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
    });
    return {
      event: {
        archiveTag: { useMutation: mutation },
        checkInMember: { useMutation: mutation },
        createEvent: { useMutation: mutation },
        createTag: { useMutation: mutation },
        deleteEvent: { useMutation: mutation },
        removeAttendance: { useMutation: mutation },
        repairIntegration: { useMutation: mutation },
        resolveDiscordProjection: { useMutation: mutation },
        retrySync: { useMutation: mutation },
        updateEvent: { useMutation: mutation },
        updateTag: { useMutation: mutation },
      },
      useUtils: () => ({
        event: {
          getAdminEvent: { invalidate: vi.fn() },
          listAdminEvents: { invalidate: vi.fn() },
          listAttendees: { invalidate: vi.fn() },
          listCheckInEvents: { invalidate: vi.fn() },
          listEventTags: { invalidate: vi.fn() },
        },
      }),
    };
  })(),
}));

const data = {
  events: [
    {
      attendanceCount: 18,
      audience: "public" as const,
      discordHealth: "synced" as const,
      endDateTime: "2026-08-12T20:00:00-04:00",
      googleHealth: "error" as const,
      id: "00000000-0000-4000-8000-000000000501",
      internal: false,
      legacy: false,
      location: "ENG2 102",
      name: "Current Workshop",
      revision: 3,
      startDateTime: "2026-08-12T18:00:00-04:00",
      tag: "Workshop",
      tagColor: "#7C3AED",
    },
  ],
  filterOptions: {
    audiences: ["public", "dues", "roles"],
    health: ["synced", "pending", "error", "unknown"],
    roles: [],
    tags: [{ color: "#7C3AED", name: "Workshop" }],
  },
  pagination: { page: 1, pageCount: 1, pageSize: 25, totalCount: 1 },
};
const currentEvent = data.events[0];
if (!currentEvent) throw new Error("Event fixture is required.");

const readerAccess = {
  canEdit: false,
  canRead: true,
  isOfficer: false,
};

describe("EventAdminDashboard", () => {
  it("reports Legacy edits as successful Blade-only history updates", () => {
    expect(eventUpdateFeedback("legacy")).toEqual({
      message:
        "Legacy event updated in Blade. Historical calendars were not changed.",
      tone: "success",
    });
  });

  it("TC-005 TC-006 renders the read-only list without mutation controls", () => {
    const html = renderToStaticMarkup(
      createElement(EventAdminDashboard, {
        access: readerAccess,
        data,
        detail: null,
        input: parseAdminEventSearchParams({ view: "list" }).input,
      }),
    );

    expect(html).toContain("List");
    expect(html).toContain("Calendar");
    expect(html).toContain("Current Workshop");
    expect(html).toContain("Workshop");
    expect(html).toContain("ENG2 102");
    expect(html).toContain("18");
    expect(html).toContain("Needs attention");
    expect(html).not.toContain("Create event");
    expect(html).not.toContain("Edit event");
    expect(html).not.toContain("Delete event");
    expect(html).not.toContain("Manage tags");
  });

  it("TC-005 shows event, integration, and tag controls to editors", () => {
    const html = renderToStaticMarkup(
      createElement(EventAdminDashboard, {
        access: { ...readerAccess, canEdit: true },
        data,
        detail: null,
        input: parseAdminEventSearchParams({ view: "list" }).input,
      }),
    );

    expect(html).toContain("Create event");
    expect(html).toContain("Tags");
    expect(html).toContain("Edit event");
    expect(html).toContain("Duplicate event");
    expect(html).toContain("Repair Google Calendar");
  });

  it("TC-006 keeps history prominent and treats past provider health as inactive", () => {
    const html = renderToStaticMarkup(
      createElement(EventAdminDashboard, {
        access: { ...readerAccess, canEdit: true },
        data: {
          ...data,
          events: [
            {
              ...currentEvent,
              endDateTime: "2026-05-10T20:00:00-04:00",
              startDateTime: "2026-05-10T18:00:00-04:00",
            },
          ],
        },
        detail: null,
        input: parseAdminEventSearchParams({ timing: "past" }).input,
      }),
    );

    expect(html).toContain('aria-label="Event timing"');
    expect(html).toContain("Upcoming");
    expect(html).toContain("Past");
    expect(html).toContain("Provider health is no longer tracked");
    expect(html).not.toContain("Needs attention");
    expect(html).not.toContain("Repair Google Calendar");
  });

  it("TC-030 keeps check-in out of event management even for dual-capability users", () => {
    const html = renderToStaticMarkup(
      createElement(EventAdminDashboard, {
        access: {
          canEdit: true,
          canRead: true,
          isOfficer: false,
        },
        data,
        detail: null,
        input: parseAdminEventSearchParams({ view: "list" }).input,
      }),
    );

    expect(html).not.toContain("Check-in");
    expect(html).not.toContain("Event check-in");
    expect(html).not.toContain("Select event");
  });
});
