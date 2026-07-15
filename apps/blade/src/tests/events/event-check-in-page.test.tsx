import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { EventCheckInPage } from "~/app/_components/admin/events/event-check-in-page";
import {
  CHECK_IN_SCANNER_OPTIONS,
  checkInEventLabel,
  CheckInFeedback,
  rearmQrPayloadsOutsideFrame,
} from "~/app/_components/admin/events/event-check-in-panel";

vi.mock("~/trpc/react", () => ({
  api: {
    event: {
      checkInMember: {
        useMutation: () => ({ mutateAsync: vi.fn() }),
      },
    },
    useUtils: () => ({
      event: {
        listCheckInEvents: { fetch: vi.fn() },
        searchCheckInMembers: { fetch: vi.fn() },
      },
    }),
  },
}));

describe("EventCheckInPage", () => {
  it("TC-022A requires a QR to leave frame before repeat mode can scan it again", () => {
    expect(CHECK_IN_SCANNER_OPTIONS).toEqual({
      allowMultiple: true,
      scanDelay: 3000,
    });
    const handled = new Set(["user:00000000-0000-4000-8000-000000000501"]);
    rearmQrPayloadsOutsideFrame(handled, [
      { rawValue: "user:00000000-0000-4000-8000-000000000501" },
    ]);
    expect(handled.size).toBe(1);
    rearmQrPayloadsOutsideFrame(handled, []);
    expect(handled.size).toBe(0);
  });

  it("TC-005 TC-020 TC-022A TC-030 TC-032 renders the isolated operational surface", () => {
    const html = renderToStaticMarkup(
      createElement(EventCheckInPage, {
        groups: {
          current: [
            {
              id: "00000000-0000-4000-8000-000000000501",
              startAt: "2026-07-20T22:00:00.000Z",
              title: "[WORKSHOP] Current Workshop",
            },
          ],
          older: [],
          recent: [
            {
              id: "00000000-0000-4000-8000-000000000502",
              startAt: "2026-07-01T22:00:00.000Z",
              title: "Past Workshop",
            },
          ],
        },
      }),
    );

    expect(html).toContain("Event check-in");
    expect(html).toContain("Upcoming");
    expect(html).toContain("Past");
    expect(html).toContain("Search events");
    expect(
      checkInEventLabel({
        startAt: "2026-07-20T22:00:00.000Z",
        title: "[WORKSHOP] Current Workshop",
      }),
    ).toContain("Jul 20, 2026");
    expect(html).toContain("Scanner");
    expect(html).toContain("Manual");
    expect(html).toContain("Allow repeat check-ins");
    expect(html).toContain('data-check-in-layout="streamlined"');
    expect(html).not.toContain("Latest result");
    expect(html).not.toContain("Choose an event, then scan");
    expect(html).not.toContain("Selecting a member does not check them in");
    expect(html).not.toContain("Results stay visible");
    expect(html).not.toContain("Find an older event");
    expect(html).not.toContain("Event management sections");
    expect(html).not.toContain("Integration health");
    expect(html).not.toContain("Attendance list");
  });

  it("TC-018 identifies the resolved member in the latest result", () => {
    const html = renderToStaticMarkup(
      createElement(CheckInFeedback, {
        result: {
          member: {
            company: "Knight Hacks",
            discordUsername: "ada.builds",
            id: "00000000-0000-4000-8000-000000000601",
            name: "Ada Builder",
            tagline: "Backend builder",
          },
          message: "Checked in.",
          state: "success",
        },
      }),
    );

    expect(html).toContain("Checked in.");
    expect(html).toContain("Ada Builder");
    expect(html).toContain("@ada.builds");
    expect(html).toContain("Backend builder");
    expect(html).not.toContain("member@example.test");
  });
});
