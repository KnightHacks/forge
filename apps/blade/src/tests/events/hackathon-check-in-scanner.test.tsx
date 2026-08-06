/** @vitest-environment jsdom */

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HackathonCheckInWorkspace } from "~/app/_components/admin/hackathon-events/hackathon-check-in-workspace";

const mocks = vi.hoisted(() => ({
  checkIn: vi.fn(),
  historyRefetch: vi.fn(() => new Promise(() => undefined)),
  onScan: null as null | ((codes: { rawValue: string }[]) => void),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () =>
    new URLSearchParams(
      "hackathon=00000000-0000-4000-8000-000000000101&event=00000000-0000-4000-8000-000000000201",
    ),
}));

vi.mock("@yudiel/react-qr-scanner", () => ({
  Scanner: ({
    onScan,
  }: {
    onScan: (codes: { rawValue: string }[]) => void;
  }) => {
    mocks.onScan = onScan;
    return <div data-testid="mock-qr-scanner" />;
  },
}));

vi.mock(
  "~/app/_components/admin/hackathon-events/check-in-result-dialog",
  () => ({
    CheckInResultDialog: ({
      onOpenChange,
      open,
    }: {
      onOpenChange: (open: boolean) => void;
      open: boolean;
    }) =>
      open ? (
        <button onClick={() => onOpenChange(false)} type="button">
          Close result
        </button>
      ) : null,
  }),
);

vi.mock("~/trpc/react", () => ({
  api: {
    hackathonEvent: {
      checkInHacker: {
        useMutation: () => ({ isPending: false, mutateAsync: mocks.checkIn }),
      },
      listCheckInHackathons: {
        useQuery: () => ({
          data: [
            {
              displayName: "Knight Hacks 2026",
              id: "00000000-0000-4000-8000-000000000101",
            },
          ],
        }),
      },
      listCheckInEvents: {
        useQuery: () => ({
          data: {
            classes: [],
            configReady: true,
            events: [
              {
                id: "00000000-0000-4000-8000-000000000201",
                name: "Primary check-in",
                points: 0,
                purpose: "primary_check_in",
                ready: true,
                startDateTime: "2026-08-05T20:00:00.000Z",
              },
            ],
          },
          isPending: false,
        }),
      },
      listCheckInHistory: {
        useInfiniteQuery: () => ({
          data: { pages: [] },
          fetchNextPage: vi.fn(),
          hasNextPage: false,
          isFetchingNextPage: false,
          isPending: false,
          refetch: mocks.historyRefetch,
        }),
      },
      retryDiscordRoles: {
        useMutation: () => ({ isPending: false, mutateAsync: vi.fn() }),
      },
      searchCheckInHackers: {
        useQuery: () => ({ data: [], isPending: false }),
      },
    },
    useUtils: () => ({
      hackathonEvent: {
        getCheckInAttempt: { fetch: vi.fn() },
        listCheckInHistory: { invalidate: vi.fn() },
      },
    }),
  },
}));

afterEach(() => {
  cleanup();
  mocks.checkIn.mockReset();
  mocks.historyRefetch.mockClear();
  mocks.onScan = null;
});

describe("HackathonCheckInWorkspace scanner lifecycle", () => {
  it("keeps the scanner mounted and accepts another QR while history refreshes", async () => {
    mocks.checkIn.mockResolvedValue({
      attemptId: "00000000-0000-4000-8000-000000000301",
      eventName: "Primary check-in",
      eventPurpose: "primary_check_in",
      outcome: "checked_in",
    });
    render(<HackathonCheckInWorkspace />);

    fireEvent.click(screen.getByRole("button", { name: "Open scanner" }));
    expect(screen.getByTestId("mock-qr-scanner")).toBeInTheDocument();

    act(() => {
      mocks.onScan?.([{ rawValue: "user:first" }]);
    });
    await waitFor(() => expect(mocks.checkIn).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByRole("button", { name: "Close result" }),
    ).toBeVisible();
    expect(screen.getByTestId("mock-qr-scanner")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Close scanner" }),
    ).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Close result" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Close result" }),
      ).not.toBeInTheDocument(),
    );

    act(() => {
      mocks.onScan?.([{ rawValue: "user:second" }]);
    });
    await waitFor(() => expect(mocks.checkIn).toHaveBeenCalledTimes(2));
    expect(mocks.historyRefetch).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("mock-qr-scanner")).toBeInTheDocument();
  });
});
