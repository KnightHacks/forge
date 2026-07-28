/** @vitest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RESUME_BUNDLE_DOWNLOAD_COOKIE } from "~/consts/browser-storage";

const toast = { error: vi.fn(), success: vi.fn() };

vi.mock("@forge/ui/toast", () => ({ toast }));

const { useResumeBundleDownload } =
  await import("~/app/_components/admin/analytics/resume-bundle-download");

const TOKEN = "0123456789abcdef0123456789abcdef";
const clickedHrefs: string[] = [];

function setSignal(value: string) {
  document.cookie = `${RESUME_BUNDLE_DOWNLOAD_COOKIE}=${value}; Path=/`;
}

function readSignal() {
  const prefix = `${RESUME_BUNDLE_DOWNLOAD_COOKIE}=`;
  return (
    document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(prefix))
      ?.slice(prefix.length) ?? null
  );
}

function advance(ms: number) {
  act(() => void vi.advanceTimersByTime(ms));
}

beforeEach(() => {
  vi.useFakeTimers();
  toast.error.mockClear();
  toast.success.mockClear();
  clickedHrefs.length = 0;
  setSignal("");
  vi.stubGlobal("crypto", {
    randomUUID: () =>
      `${TOKEN.slice(0, 8)}-${TOKEN.slice(8, 12)}-${TOKEN.slice(12, 16)}-${TOKEN.slice(16, 20)}-${TOKEN.slice(20)}`,
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
    function click(this: HTMLAnchorElement) {
      clickedHrefs.push(this.getAttribute("href") ?? "");
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useResumeBundleDownload", () => {
  it("requests the archive with a fresh token and clears any stale signal", () => {
    setSignal("leftover.ready");
    const { result } = renderHook(() => useResumeBundleDownload());

    act(() => result.current.startDownload());

    expect(result.current.isPreparing).toBe(true);
    expect(clickedHrefs).toEqual([
      `/api/admin/resume-bundle?downloadToken=${TOKEN}`,
    ]);
    expect(readSignal()).toBeNull();
  });

  it("ignores a signal that belongs to an earlier attempt", () => {
    // The cookie is a single slot shared by every attempt, so a stale value
    // would otherwise end this preparation before the ZIP is built.
    const { result } = renderHook(() => useResumeBundleDownload());
    act(() => result.current.startDownload());

    setSignal("someothertoken.ready");
    advance(250);
    advance(250);

    expect(result.current.isPreparing).toBe(true);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("confirms the download and stops polling once the route reports ready", () => {
    const { result } = renderHook(() => useResumeBundleDownload());
    act(() => result.current.startDownload());

    setSignal(`${TOKEN}.ready`);
    advance(250);

    expect(result.current.isPreparing).toBe(false);
    expect(toast.success).toHaveBeenCalledWith(
      "Resume bundle download started.",
    );
    expect(readSignal()).toBeNull();

    // The give-up timer has to be cancelled too, or a finished download reports
    // a timeout five minutes later.
    advance(10 * 60 * 1000);

    expect(toast.error).not.toHaveBeenCalled();
  });

  it("reports a failure the route signalled", () => {
    const { result } = renderHook(() => useResumeBundleDownload());
    act(() => result.current.startDownload());

    setSignal(`${TOKEN}.error`);
    advance(250);

    expect(result.current.isPreparing).toBe(false);
    expect(toast.error).toHaveBeenCalledWith(
      "The resume bundle could not be prepared. Please try again.",
    );
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("gives up after five minutes rather than polling forever", () => {
    const { result } = renderHook(() => useResumeBundleDownload());
    act(() => result.current.startDownload());

    advance(5 * 60 * 1000 - 1);

    expect(result.current.isPreparing).toBe(true);

    advance(1);

    expect(result.current.isPreparing).toBe(false);
    expect(toast.error).toHaveBeenCalledWith(
      "Resume preparation is taking longer than expected. Please try again.",
    );
  });

  it("ignores a second request while one is already in flight", () => {
    const { result } = renderHook(() => useResumeBundleDownload());
    act(() => result.current.startDownload());
    act(() => result.current.startDownload());

    expect(clickedHrefs).toHaveLength(1);
  });

  it("stops both timers when the page moves on", () => {
    const { result, unmount } = renderHook(() => useResumeBundleDownload());
    act(() => result.current.startDownload());

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
