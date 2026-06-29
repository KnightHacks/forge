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
    endDateTime: "2026-08-12T20:00:00-04:00",
    id: "00000000-0000-4000-8000-000000000501",
    internal: true,
    location: "ENG2 102",
    name: "Current Workshop",
    points: 10,
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
    expect(html).toContain("Estimated");
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
    expect(html).toContain("Estimated points acknowledgement");
    expect(html).toContain("Events with attendance cannot be deleted");
    expect(html).not.toContain("Confirm delete event");
  });
});
