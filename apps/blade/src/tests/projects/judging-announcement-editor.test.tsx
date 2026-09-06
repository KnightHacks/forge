/** @vitest-environment jsdom */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { RouterOutputs } from "@forge/api";

import {
  AnnouncementDialog,
  JudgingControlPanel,
} from "~/app/_components/judging/judging-control-panel";

const mutations = vi.hoisted(() => ({
  adminData: undefined as unknown,
  clear: vi.fn(),
  publish: vi.fn(),
  refetch: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/judging",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("~/app/_components/shared/route-transition-link", () => ({
  useNavigationRouter: () => ({
    refresh: vi.fn(),
    replace: mutations.replace,
  }),
}));

vi.mock("@forge/ui/use-media-query", () => ({
  useMediaQuery: () => true,
}));

vi.mock("~/trpc/react", () => {
  const idleMutation = () => ({ isPending: false, mutateAsync: vi.fn() });
  return {
    api: {
      judging: {
        archiveRoom: { useMutation: idleMutation },
        clearAnnouncement: {
          useMutation: () => ({
            isPending: false,
            mutateAsync: mutations.clear,
          }),
        },
        createRoom: { useMutation: idleMutation },
        generateRoomLink: { useMutation: idleMutation },
        listAdmin: {
          useQuery: () => ({
            data: mutations.adminData,
            isFetching: false,
            refetch: mutations.refetch,
          }),
        },
        listDiscordChannels: {
          useQuery: () => ({ data: [], isError: false, isLoading: false }),
        },
        moveRoom: { useMutation: idleMutation },
        provisionRoomThreads: { useMutation: idleMutation },
        publishAnnouncement: {
          useMutation: () => ({
            isPending: false,
            mutateAsync: mutations.publish,
          }),
        },
        removeJudgeFromRoom: { useMutation: idleMutation },
        revokeGuest: { useMutation: idleMutation },
        revokeRoomLink: { useMutation: idleMutation },
        rotateRoomLink: { useMutation: idleMutation },
        sendRoomQr: { useMutation: idleMutation },
        setCommsChannel: { useMutation: idleMutation },
        updateRoom: { useMutation: idleMutation },
      },
    },
  };
});

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

  it("follows polling replacements for an open room editor", async () => {
    const user = userEvent.setup();
    const roomId = "00000000-0000-4000-8000-000000000004";
    const roomAnnouncement = { ...first, roomId } satisfies Announcement;
    const roomReplacement = {
      ...replacement,
      includeGuests: true,
      isUrgent: true,
      roomId,
    } satisfies Announcement;
    const room = {
      activeLinkId: null,
      announcement: roomAnnouncement,
      archivedAt: null,
      challengeId: "00000000-0000-4000-8000-000000000005",
      challengeLabel: "Sponsor challenge",
      discordThreadId: null,
      id: roomId,
      judges: [],
      name: "Sponsor suite A",
    } as ControlData["rooms"][number];
    const initialData = {
      challenges: [{ id: room.challengeId, label: room.challengeLabel }],
      configuration: {
        closedAt: null,
        displayAllResults: false,
        judgingCommsChannelId: null,
        openedAt: null,
        state: "draft",
      },
      discordGuildId: null,
      globalAnnouncement: null,
      hackathon: {
        displayName: "Knight Hacks IX",
        id: data.hackathon.id,
        timezone: "America/New_York",
      },
      inventoryLockedAt: null,
      rooms: [room],
      rubric: [],
    } as ControlData;
    mutations.adminData = initialData;
    const view = render(
      <JudgingControlPanel hackathons={[]} initialData={initialData} />,
    );

    await user.click(screen.getByRole("button", { name: "Announce" }));
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue(
      roomAnnouncement.message,
    );
    await user.clear(screen.getByRole("textbox", { name: "Message" }));
    await user.type(
      screen.getByRole("textbox", { name: "Message" }),
      "Stale room draft",
    );

    mutations.adminData = {
      ...initialData,
      rooms: [{ ...room, announcement: roomReplacement }],
    };
    view.rerender(
      <JudgingControlPanel hackathons={[]} initialData={initialData} />,
    );

    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue(
        roomReplacement.message,
      ),
    );
    expect(
      screen.getByRole("switch", { name: /Include guest judges/ }),
    ).toBeChecked();
    expect(
      screen.getByRole("switch", { name: /Urgent announcement/ }),
    ).toBeChecked();
  });
});
