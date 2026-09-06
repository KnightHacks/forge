/** @vitest-environment jsdom */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { RouterOutputs } from "@forge/api";

import { AnnouncementDialog } from "~/app/_components/judging/judging-control-panel";

const mutations = vi.hoisted(() => ({
  clear: vi.fn(),
  publish: vi.fn(),
}));

vi.mock("~/trpc/react", () => ({
  api: {
    judging: {
      clearAnnouncement: {
        useMutation: () => ({
          isPending: false,
          mutateAsync: mutations.clear,
        }),
      },
      publishAnnouncement: {
        useMutation: () => ({
          isPending: false,
          mutateAsync: mutations.publish,
        }),
      },
    },
  },
}));

vi.stubGlobal(
  "ResizeObserver",
  class {
    disconnect() {
      return undefined;
    }
    observe() {
      return undefined;
    }
    unobserve() {
      return undefined;
    }
  },
);

type ControlData = RouterOutputs["judging"]["listAdmin"];
type Announcement = NonNullable<ControlData["globalAnnouncement"]>;

const data = {
  hackathon: { id: "00000000-0000-4000-8000-000000000001" },
} as ControlData;

const first = {
  id: "00000000-0000-4000-8000-000000000002",
  includeGuests: false,
  isUrgent: false,
  message: "Judging pauses at 4:30 PM.",
  publishedAt: new Date("2026-09-06T14:00:00.000Z"),
  roomId: null,
} satisfies Announcement;

const replacement = {
  ...first,
  id: "00000000-0000-4000-8000-000000000003",
  message: "Judging now pauses at 4:45 PM.",
} satisfies Announcement;

describe("judging announcement editor", () => {
  it("resets an open draft when polling replaces the announcement", async () => {
    const user = userEvent.setup();
    const view = render(
      <AnnouncementDialog
        current={first}
        data={data}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        room={null}
      />,
    );

    const message = screen.getByRole("textbox", { name: "Message" });
    await user.clear(message);
    await user.type(message, "Unsaved local draft");
    await user.click(
      screen.getByRole("switch", { name: /Include guest judges/ }),
    );
    await user.click(
      screen.getByRole("switch", { name: /Urgent announcement/ }),
    );

    view.rerender(
      <AnnouncementDialog
        current={replacement}
        data={data}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        room={null}
      />,
    );

    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue(
        replacement.message,
      ),
    );
    expect(
      screen.getByRole("switch", { name: /Include guest judges/ }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("switch", { name: /Urgent announcement/ }),
    ).not.toBeChecked();
  });
});
