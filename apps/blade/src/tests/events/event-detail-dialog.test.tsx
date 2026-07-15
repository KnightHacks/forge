import type { ReactNode } from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { EventDetailDialog } from "~/app/_components/admin/events/event-detail-dialog";

vi.mock("@forge/ui/dialog", async () => {
  const { createElement } = await import("react");
  const Container = ({ children, ...props }: { children: ReactNode }) =>
    createElement("div", props, children);

  return {
    Dialog: ({ children }: { children: ReactNode }) =>
      createElement("div", { role: "dialog" }, children),
    DialogClose: Container,
    DialogContent: Container,
    DialogDescription: Container,
    DialogFooter: Container,
    DialogHeader: Container,
    DialogTitle: Container,
  };
});

vi.mock("~/trpc/react", () => ({
  api: (() => {
    const mutation = () => ({ isPending: false, mutate: vi.fn() });
    return {
      event: {
        deleteEvent: { useMutation: mutation },
        removeAttendance: { useMutation: mutation },
        repairIntegration: { useMutation: mutation },
        retrySync: { useMutation: mutation },
      },
    };
  })(),
}));

const detail = {
  attendees: [
    {
      checkedInAt: "2026-08-12T22:01:00.000Z",
      checkedInBy: "Event Operator",
      discordUsername: "ada.builds",
      estimated: true,
      memberId: "00000000-0000-4000-8000-000000000601",
      name: "Ada Builder",
      pointsAwarded: 10,
    },
  ],
  event: {
    attendanceCount: 1,
    audience: "roles" as const,
    description: "Build a typed API client.",
    deletionPending: false,
    endDateTime: "2026-08-12T20:00:00-04:00",
    id: "00000000-0000-4000-8000-000000000501",
    internal: true,
    location: "ENG2 102",
    name: "Current Workshop",
    points: 10,
    revision: 3,
    roles: [{ id: "00000000-0000-4000-8000-000000000602", name: "Design" }],
    startDateTime: "2026-08-12T18:00:00-04:00",
    tag: "Workshop",
    tagColor: "#7C3AED",
  },
  integrations: {
    discord: { health: "synced" as const, url: null },
    google: {
      health: "error" as const,
      message: "Calendar update needs attention.",
      url: null,
    },
  },
};

describe("EventDetailDialog", () => {
  it("TC-007 TC-023 renders one sectioned read-only hierarchy", () => {
    const html = renderToStaticMarkup(
      createElement(EventDetailDialog, {
        access: { canEdit: false, canRead: true, isOfficer: false },
        detail,
        onChanged: vi.fn(),
        onClose: vi.fn(),
      }),
    );

    expect(html).toContain('data-event-detail-layout="sectioned"');
    expect(html).toContain("Current Workshop");
    expect(html).toContain("Overview");
    expect(html).toContain("Schedule &amp; location");
    expect(html).toContain("Audience &amp; points");
    expect(html).toContain("Integration health");
    expect(html).toContain("Attendance");
    expect(html).toContain("Ada Builder");
    expect(html).toContain("@ada.builds");
    expect(html).not.toContain("Estimated");
    expect(html).toContain("Export attendance");
    expect(html).not.toContain("Edit event");
    expect(html).not.toContain("Remove Ada Builder");
    expect(html).not.toContain("Delete event");
  });

  it("TC-024 TC-025 shows correction controls but blocks attended deletion", () => {
    const html = renderToStaticMarkup(
      createElement(EventDetailDialog, {
        access: { canEdit: true, canRead: true, isOfficer: false },
        detail,
        onChanged: vi.fn(),
        onClose: vi.fn(),
      }),
    );

    expect(html).toContain("Edit event");
    expect(html).toContain("Repair Google Calendar");
    expect(html).toContain("Remove Ada Builder");
    expect(html).not.toContain("Estimated points acknowledgement");
    expect(html).not.toContain("legacy point award");
    expect(html).toContain("Checked in");
    expect(html).toContain("Operator Event Operator");
    expect(html).toContain("Reapply Discord");
    expect(html).toContain("Events with attendance cannot be deleted");
    expect(html).not.toContain("Confirm delete event");
  });

  it("blocks deletion when loaded attendees expose a stale aggregate", () => {
    const html = renderToStaticMarkup(
      createElement(EventDetailDialog, {
        access: { canEdit: true, canRead: true, isOfficer: false },
        detail: {
          ...detail,
          event: { ...detail.event, attendanceCount: 0 },
        },
        onChanged: vi.fn(),
        onClose: vi.fn(),
      }),
    );

    expect(html).toContain("1 checked in");
    expect(html).toContain("Events with attendance cannot be deleted");
    expect(html).not.toContain("Confirm delete event");
  });

  it("labels Legacy history and hides provider mutation controls", () => {
    const html = renderToStaticMarkup(
      createElement(EventDetailDialog, {
        access: { canEdit: true, canRead: true, isOfficer: false },
        detail: {
          ...detail,
          attendees: [],
          event: {
            ...detail.event,
            attendanceCount: 0,
            deletionPending: true,
            legacy: true,
          },
          integrations: {
            discord: { health: "unknown" as const, url: null },
            google: { health: "unknown" as const, url: null },
          },
        },
        onChanged: vi.fn(),
        onClose: vi.fn(),
      }),
    );

    expect(html).toContain("Legacy history");
    expect(html).toContain("Historical Legacy event");
    expect(html).toContain("Retry deletion cleanup");
    expect(html).not.toContain("Repair Discord");
    expect(html).not.toContain("Reapply Discord");
    expect(html).not.toContain("Review Discord candidates");
    expect(html).not.toContain("Discord status unknown");
    expect(html).not.toContain("Google Calendar status unknown");
  });

  it("treats completed non-Legacy provider health as no longer actionable", () => {
    const html = renderToStaticMarkup(
      createElement(EventDetailDialog, {
        access: { canEdit: true, canRead: true, isOfficer: false },
        detail: {
          ...detail,
          attendees: [],
          event: {
            ...detail.event,
            attendanceCount: 0,
            endDateTime: "2026-05-10T20:00:00-04:00",
            legacy: false,
            startDateTime: "2026-05-10T18:00:00-04:00",
          },
        },
        onChanged: vi.fn(),
        onClose: vi.fn(),
      }),
    );

    expect(html).toContain("Provider health is no longer tracked");
    expect(html).not.toContain("Repair Discord");
    expect(html).not.toContain("Reapply Discord");
    expect(html).not.toContain("Repair Google Calendar");
  });

  it("routes unknown Discord creation through explicit resolution", () => {
    const html = renderToStaticMarkup(
      createElement(EventDetailDialog, {
        access: { canEdit: true, canRead: true, isOfficer: false },
        detail: {
          ...detail,
          event: { ...detail.event, deletionPending: false, legacy: false },
          integrations: {
            ...detail.integrations,
            discord: { health: "unknown" as const, url: null },
          },
        },
        onChanged: vi.fn(),
        onClose: vi.fn(),
      }),
    );

    expect(html).toContain("Review Discord candidates");
    expect(html).not.toContain("Repair Discord");
  });

  it("repairs an unknown Discord projection when Blade has a trusted ID", () => {
    const html = renderToStaticMarkup(
      createElement(EventDetailDialog, {
        access: { canEdit: true, canRead: true, isOfficer: false },
        detail: {
          ...detail,
          event: { ...detail.event, deletionPending: false, legacy: false },
          integrations: {
            ...detail.integrations,
            discord: {
              health: "unknown" as const,
              url: "https://discord.com/events/486628710443778071/1234",
            },
          },
        },
        onChanged: vi.fn(),
        onClose: vi.fn(),
      }),
    );

    expect(html).toContain("Open Discord event");
    expect(html).toContain("Repair Discord");
    expect(html).not.toContain("Review Discord candidates");
  });

  it("does not misrepresent an attendee transport failure as empty", () => {
    const html = renderToStaticMarkup(
      createElement(EventDetailDialog, {
        access: { canEdit: false, canRead: true, isOfficer: false },
        detail: { ...detail, attendees: [], attendeesError: true },
        onChanged: vi.fn(),
        onClose: vi.fn(),
      }),
    );

    expect(html).toContain("Attendance could not be loaded");
    expect(html).toContain("Retry attendance");
    expect(html).not.toContain("No members have checked in");
  });
});
