import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  CHECK_IN_QR_SCANNER_OPTIONS,
  claimCheckInQrPayload,
  observeCheckInQrPayloads,
  rearmAbsentCheckInQrPayloads,
  releaseCheckInQrPayload,
} from "~/app/_components/admin/check-in-qr-scanner";
import { EventCheckInPage } from "~/app/_components/admin/events/event-check-in-page";
import {
  checkInEventLabel,
  CheckInFeedback,
  isCurrentCheckInRequest,
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
  it("TC-022A re-arms after a QR leaves view and accepts the next visible code", () => {
    expect(CHECK_IN_QR_SCANNER_OPTIONS).toEqual({
      allowMultiple: true,
      scanDelay: 3000,
    });
    const lock = { current: false };
    const handled = new Set<string>();
    const lastSeenAt = new Map<string, number>();
    const first = "user:00000000-0000-4000-8000-000000000501";
    const second = "user:00000000-0000-4000-8000-000000000502";

    observeCheckInQrPayloads(lastSeenAt, [{ rawValue: first }], 1000);
    expect(claimCheckInQrPayload(lock, handled, [{ rawValue: first }])).toBe(
      first,
    );
    expect(
      claimCheckInQrPayload(lock, handled, [{ rawValue: second }]),
    ).toBeNull();
    releaseCheckInQrPayload(lock);
    expect(
      claimCheckInQrPayload(lock, handled, [{ rawValue: first }]),
    ).toBeNull();

    rearmAbsentCheckInQrPayloads(handled, lastSeenAt, 1999);
    expect(handled.has(first)).toBe(true);
    rearmAbsentCheckInQrPayloads(handled, lastSeenAt, 2000);
    expect(claimCheckInQrPayload(lock, handled, [{ rawValue: first }])).toBe(
      first,
    );
    releaseCheckInQrPayload(lock);
    expect(
      claimCheckInQrPayload(lock, handled, [
        { rawValue: first },
        { rawValue: second },
      ]),
    ).toBe(second);
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

  it("ignores a completed request after the station context changes", () => {
    expect(isCurrentCheckInRequest(4, 4)).toBe(true);
    expect(isCurrentCheckInRequest(4, 5)).toBe(false);
  });
});
