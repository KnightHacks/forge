/** @vitest-environment jsdom */
import type { ReactNode } from "react";
import { Component, Suspense, use, useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  NavigationProvider,
  RouteTransitionSurface,
  useNavigationPathname,
  useNavigationRouter,
} from "~/app/_components/shared/route-transition-link";

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
  usePathname: () => "/",
}));

function Controls() {
  const router = useNavigationRouter();
  const pathname = useNavigationPathname();
  return (
    <>
      <output aria-label="Navigation destination">{pathname}</output>
      <button onClick={() => router.push("/first")}>First</button>
      <button onClick={() => router.replace("/second", { scroll: false })}>
        Second
      </button>
      <button onClick={() => router.refresh()}>Refresh</button>
      <button onClick={() => router.push("/#details")}>Anchor</button>
    </>
  );
}

function Content({ result }: { result: Promise<string> }) {
  return <p>{use(result)}</p>;
}

function deferred() {
  let resolve!: (value: string) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<string>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

class RouteErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p role="alert">Route unavailable</p>
    ) : (
      this.props.children
    );
  }
}

async function renderNavigation() {
  const ready = Promise.resolve("Original content");
  const first = deferred();
  const second = deferred();
  function App() {
    const [result, setResult] = useState(ready);
    navigation.push.mockImplementation((href: string) => {
      if (href === "/first") setResult(first.promise);
    });
    navigation.replace.mockImplementation(() => setResult(second.promise));
    navigation.refresh.mockImplementation(() => setResult(first.promise));
    return (
      <NavigationProvider>
        <Controls />
        <RouteTransitionSurface>
          <RouteErrorBoundary>
            <Suspense fallback={<p>Skeleton</p>}>
              <Content result={result} />
            </Suspense>
          </RouteErrorBoundary>
        </RouteTransitionSurface>
      </NavigationProvider>
    );
  }
  await act(async () => {
    render(<App />);
    await ready;
  });
  return { first, second };
}

async function clickButton(name: string) {
  // Flush React's suspended transition work, not just the synchronous click.
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
    await Promise.resolve();
  });
}

beforeEach(() => vi.clearAllMocks());

describe("Blade route transition lifetime", () => {
  it("starts immediately, retains content and clears feedback after completion", async () => {
    const { first } = await renderNavigation();
    await clickButton("First");
    expect(navigation.push).toHaveBeenCalledWith("/first", undefined);
    expect(
      screen.getByRole("progressbar", { name: "Loading page" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Navigation destination")).toHaveTextContent(
      "/first",
    );
    expect(screen.getByText("Original content")).toBeInTheDocument();
    await act(async () => {
      first.resolve("First content");
      await first.promise;
    });
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByText("First content")).toBeInTheDocument();
  });

  it("uses the newest destination during rapid navigation and preserves replace options", async () => {
    const { first, second } = await renderNavigation();
    await clickButton("First");
    await clickButton("Second");
    expect(navigation.replace).toHaveBeenCalledWith("/second", {
      scroll: false,
    });
    expect(screen.getByLabelText("Navigation destination")).toHaveTextContent(
      "/second",
    );
    await act(async () => {
      first.resolve("First content");
      second.resolve("Second content");
      await Promise.all([first.promise, second.promise]);
    });
    expect(screen.getByText("Second content")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("tracks refreshes without changing the destination", async () => {
    const { first } = await renderNavigation();
    await clickButton("Refresh");
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.getByLabelText("Navigation destination")).toHaveTextContent(
      "/",
    );
    await act(async () => {
      first.resolve("Refreshed content");
      await first.promise;
    });
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("clears feedback when a route reaches its error boundary", async () => {
    const { first } = await renderNavigation();
    const errorLog = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    try {
      await clickButton("First");
      await act(async () => {
        first.reject(new Error("Route unavailable"));
        await first.promise.catch(() => undefined);
      });
      expect(screen.getByRole("alert")).toHaveTextContent("Route unavailable");
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    } finally {
      errorLog.mockRestore();
    }
  });

  it("leaves same-page anchors free of loading feedback", async () => {
    await renderNavigation();
    await clickButton("Anchor");
    expect(navigation.push).toHaveBeenCalledWith("/#details", undefined);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});
