/** @vitest-environment jsdom */
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { JudgingLiveUpdates } from "~/app/_components/judging/judging-live-updates";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  judging: vi.fn(),
  projects: vi.fn(),
  subscribe: vi.fn(),
  reset: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => ({
      judging: { invalidate: mocks.judging },
      projects: { invalidate: mocks.projects },
    }),
    judging: { onChange: { useSubscription: mocks.subscribe } },
  },
}));

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("refreshes queries and server data immediately when a pushed update arrives", () => {
  let onData: (() => void) | undefined;
  mocks.subscribe.mockImplementation(
    (_input: unknown, options: { onData: () => void }) => {
      onData = options.onData;
      return { reset: mocks.reset };
    },
  );
  render(<JudgingLiveUpdates hackathonId="event" />);
  expect(mocks.subscribe).toHaveBeenCalledWith(
    { hackathonId: "event" },
    expect.any(Object),
  );
  expect(mocks.refresh).not.toHaveBeenCalled();
  onData?.();
  expect(mocks.judging).toHaveBeenCalledOnce();
  expect(mocks.projects).toHaveBeenCalledOnce();
  expect(mocks.refresh).toHaveBeenCalledOnce();
});

it("refreshes the server access gate when access is revoked", () => {
  let onError: ((error: { data: { code: string } }) => void) | undefined;
  mocks.subscribe.mockImplementation(
    (_input: unknown, options: { onError: typeof onError }) => {
      onError = options.onError;
      return { reset: mocks.reset };
    },
  );
  render(<JudgingLiveUpdates hackathonId="event" />);
  onError?.({ data: { code: "UNAUTHORIZED" } });
  expect(mocks.refresh).toHaveBeenCalledOnce();
});

it("does not start a server refresh while the browser is offline", () => {
  let onData: (() => void) | undefined;
  mocks.subscribe.mockImplementation(
    (_input: unknown, options: { onData: () => void }) => {
      onData = options.onData;
      return { reset: mocks.reset };
    },
  );
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  render(<JudgingLiveUpdates hackathonId="event" />);
  onData?.();
  expect(mocks.refresh).not.toHaveBeenCalled();
  expect(mocks.judging).not.toHaveBeenCalled();
  expect(mocks.projects).not.toHaveBeenCalled();
});

it("reconnects immediately on network recovery and cleans up on unmount", () => {
  mocks.subscribe.mockReturnValue({ reset: mocks.reset });
  const { unmount } = render(<JudgingLiveUpdates hackathonId="event" />);
  fireEvent(window, new Event("online"));
  expect(mocks.reset).toHaveBeenCalledOnce();
  unmount();
  fireEvent(window, new Event("online"));
  expect(mocks.reset).toHaveBeenCalledOnce();
});
