/** @vitest-environment jsdom */

import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useChartDimensions } from "~/app/_components/admin/analytics/analytics-chart-dimensions";

let observers: FakeResizeObserver[] = [];
let measuredSize = { height: 0, width: 0 };

class FakeResizeObserver {
  observed: Element[] = [];
  disconnected = false;

  constructor(private readonly callback: () => void) {
    observers.push(this);
  }

  observe(element: Element) {
    this.observed.push(element);
  }

  unobserve() {
    // The hook only ever disconnects.
  }

  disconnect() {
    this.disconnected = true;
  }

  emit() {
    act(() => this.callback());
  }
}

function latestObserver() {
  const observer = observers.at(-1);
  if (!observer) throw new Error("The hook created no ResizeObserver.");
  return observer;
}

beforeEach(() => {
  observers = [];
  measuredSize = { height: 0, width: 0 };
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    () => ({ ...measuredSize }) as DOMRect,
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const renders: (ReturnType<typeof useChartDimensions>["dimensions"] | null)[] =
  [];

function ChartProbe() {
  const { containerRef, dimensions } = useChartDimensions();
  renders.push(dimensions);
  return <div ref={containerRef} />;
}

function renderProbe() {
  renders.length = 0;
  return render(<ChartProbe />);
}

describe("useChartDimensions", () => {
  it("reports no dimensions until the container has a real size", () => {
    // Recharts is handed these dimensions directly. A 0×0 first paint has to
    // stay `null` so the caller renders its placeholder instead of a chart with
    // collapsed axes.
    renderProbe();

    expect(renders.at(-1)).toBeNull();
  });

  it("floors the measured size once the container is laid out", () => {
    renderProbe();
    measuredSize = { height: 300.7, width: 500.2 };
    latestObserver().emit();

    expect(renders.at(-1)).toEqual({ height: 300, width: 500 });
  });

  it("keeps one dimensions object while the size is unchanged", () => {
    // The object is handed to Recharts as `initialDimension`. A fresh object on
    // every observer callback would make an unchanged layout look like a
    // resize.
    renderProbe();
    measuredSize = { height: 300, width: 500 };
    latestObserver().emit();
    const settled = renders.at(-1);

    latestObserver().emit();
    latestObserver().emit();

    expect(settled).toEqual({ height: 300, width: 500 });
    expect(renders.at(-1)).toBe(settled);
  });

  it("falls back to no dimensions when the container is collapsed again", () => {
    renderProbe();
    measuredSize = { height: 300, width: 500 };
    latestObserver().emit();

    measuredSize = { height: 0, width: 500 };
    latestObserver().emit();

    expect(renders.at(-1)).toBeNull();
  });

  it("disconnects the observer on unmount", () => {
    const view = renderProbe();

    expect(latestObserver().observed).toHaveLength(1);

    view.unmount();

    expect(latestObserver().disconnected).toBe(true);
  });
});
