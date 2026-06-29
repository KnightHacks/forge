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

const checkInEvents = {
  current: [
    {
      id: "00000000-0000-4000-8000-000000000501",
      title: "[WORKSHOP] Current Workshop",
    },
  ],
  older: [],
  recent: [],
};

const readerAccess = {
  canCheckIn: false,
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
        checkInEvents: null,
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
        checkInEvents: null,
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

  it("TC-005 TC-033 isolates check-in-only users from event configuration", () => {
    const html = renderToStaticMarkup(
      createElement(EventAdminDashboard, {
        access: {
          canCheckIn: true,
          canEdit: false,
          canRead: false,
          isOfficer: false,
        },
        checkInEvents,
        data: null,
        detail: null,
        input: parseAdminEventSearchParams({ view: "check-in" }).input,
      }),
    );

    expect(html).toContain("Check-in");
    expect(html).toContain("Select event");
    expect(html).toContain("Find an older event");
    expect(html).toContain("[WORKSHOP] Current Workshop");
    expect(html).not.toContain("Calendar");
    expect(html).not.toContain("Tags");
    expect(html).not.toContain("Integration health");
    expect(html).not.toContain("Attendance list");
  });
});
