"use client";

import { useEffect, useRef, useState } from "react";

export interface ChartDimensions {
  height: number;
  width: number;
}

/**
 * Measures the chart container so Recharts can be given a concrete size instead
 * of relying on its own responsive wrapper, which reports 0×0 on the first
 * client paint and produces a flash of clipped axes.
 *
 * A zero or negative measurement resets to `null` so the caller renders its
 * placeholder rather than a chart with a collapsed axis, and an unchanged
 * measurement returns the previous object so a `ResizeObserver` callback that
 * fires without a real size change does not re-render the chart.
 */
export function useChartDimensions() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<ChartDimensions | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const update = () => {
      const bounds = container.getBoundingClientRect();
      const height = Math.floor(bounds.height);
      const width = Math.floor(bounds.width);
      setDimensions((current) => {
        if (height <= 0 || width <= 0) return null;
        return current?.height === height && current.width === width
          ? current
          : { height, width };
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return { containerRef, dimensions };
}
