/** @vitest-environment jsdom */

import { startTransition } from "react";
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
import { NavigationProvider } from "~/app/_components/shared/route-transition-link";

const mocks = vi.hoisted(() => ({
  checkIn: vi.fn(),
  historyRefetch: vi.fn(() => new Promise(() => undefined)),
  onScan: null as null | ((codes: { rawValue: string }[]) => void),
  replace: vi.fn(),
  search:
    "hackathon=00000000-0000-4000-8000-000000000101&event=00000000-0000-4000-8000-000000000201",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams(mocks.search),
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
            {
              displayName: "Knight Hacks 2027",
              id: "00000000-0000-4000-8000-000000000102",
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
              {
                id: "00000000-0000-4000-8000-000000000202",
                name: "Second check-in",
                points: 0,
                purpose: "primary_check_in",
                ready: true,
                startDateTime: "2026-08-06T20:00:00.000Z",
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
  mocks.replace.mockReset();
  mocks.search =
    "hackathon=00000000-0000-4000-8000-000000000101&event=00000000-0000-4000-8000-000000000201";
});

function holdNavigation() {
  let resolve: (() => void) | undefined;
  const promise = new Promise<void>((release) => {
    resolve = release;
  });
  mocks.replace.mockImplementation(() => {
    startTransition(async () => {
      await promise;
    });
  });
  return { promise, resolve: () => resolve?.() };
}

async function select(name: string, value: string) {
  await act(async () => {
    fireEvent.change(screen.getByRole("combobox", { name }), {
      target: { value },
    });
    await Promise.resolve();
  });
}

describe("HackathonCheckInWorkspace pending selection", () => {
  const hackathonId = "00000000-0000-4000-8000-000000000101";
  const eventId = "00000000-0000-4000-8000-000000000202";
  const workspace = (
    <NavigationProvider>
      <HackathonCheckInWorkspace />
    </NavigationProvider>
  );

  it("shows the event immediately and defers scans until that event commits", async () => {
    const response = holdNavigation();
    mocks.checkIn.mockResolvedValue({ outcome: "checked_in" });
    render(workspace);
    fireEvent.click(screen.getByRole("button", { name: "Open scanner" }));
    await select("Event", eventId);
    expect(screen.getByRole("combobox", { name: "Event" })).toHaveValue(
      eventId,
    );
    expect(screen.getByRole("progressbar")).toBeVisible();
    act(() => mocks.onScan?.([{ rawValue: "user:pending-selection" }]));
    expect(mocks.checkIn).not.toHaveBeenCalled();

    mocks.search = `hackathon=${hackathonId}&event=${eventId}`;
    await act(async () => {
      response.resolve();
      await response.promise;
    });
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Event" })).toHaveValue(
      eventId,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open scanner" }));
    await act(async () => {
      mocks.onScan?.([{ rawValue: "user:pending-selection" }]);
      await Promise.resolve();
    });
    expect(mocks.checkIn).toHaveBeenCalledWith(
      expect.objectContaining({ eventId, hackathonId }),
    );
  });

  it("shows a new hackathon and clears its event before navigation completes", async () => {
    const response = holdNavigation();
    render(workspace);
    const nextHackathon = "00000000-0000-4000-8000-000000000102";
    await select("Hackathon", nextHackathon);
    expect(screen.getByRole("combobox", { name: "Hackathon" })).toHaveValue(
      nextHackathon,
    );
    expect(screen.getByRole("combobox", { name: "Event" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Event" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Open scanner" })).toBeDisabled();
    expect(mocks.replace).toHaveBeenCalledWith(
      `/admin/hackathon-check-in?hackathon=${nextHackathon}`,
      undefined,
    );
    mocks.search = `hackathon=${nextHackathon}`;
    await act(async () => {
      response.resolve();
      await response.promise;
    });
    expect(screen.getByRole("combobox", { name: "Hackathon" })).toHaveValue(
      nextHackathon,
    );
    expect(screen.getByRole("combobox", { name: "Event" })).toBeEnabled();
  });

  it("restores URL values after cancellation and subsequent history changes", async () => {
    const response = holdNavigation();
    const view = render(workspace);
    await select("Event", eventId);
    expect(screen.getByRole("combobox", { name: "Event" })).toHaveValue(
      eventId,
    );
    await act(async () => {
      response.resolve();
      await response.promise;
    });
    expect(screen.getByRole("combobox", { name: "Event" })).toHaveValue(
      "00000000-0000-4000-8000-000000000201",
    );
    mocks.search = `hackathon=${hackathonId}&event=${eventId}`;
    view.rerender(
      <NavigationProvider>
        <HackathonCheckInWorkspace />
      </NavigationProvider>,
    );
    expect(screen.getByRole("combobox", { name: "Event" })).toHaveValue(
      eventId,
    );
  });
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
