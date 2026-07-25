import { describe, expect, it } from "vitest";

import type { GlobeCluster } from "../app/_components/guild-globe";
import {
  GLOBE_MAX_ZOOM_SCALE,
  GLOBE_MIN_ZOOM_SCALE,
  globeClusterRadius,
  groupGlobeClusters,
} from "../app/_components/globe-clustering";

const clusters = [
  {
    count: 2,
    key: "san-francisco",
    label: "San Francisco, CA",
    latitude: 37.7749,
    longitude: -122.4194,
    name: "San Francisco",
    profiles: [],
    state: "CA",
  },
  {
    count: 3,
    key: "santa-clara",
    label: "Santa Clara, CA",
    latitude: 37.3541,
    longitude: -121.9552,
    name: "Santa Clara",
    profiles: [],
    state: "CA",
  },
  {
    count: 1,
    key: "orlando",
    label: "Orlando, FL",
    latitude: 28.5383,
    longitude: -81.3792,
    name: "Orlando",
    profiles: [],
    state: "FL",
  },
] satisfies GlobeCluster[];

describe("semantic globe clustering", () => {
  it("groups nearby cities at world scale", () => {
    const groups = groupGlobeClusters(clusters, 1);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      cityKeys: ["san-francisco", "santa-clara"],
      count: 5,
      primaryKey: "santa-clara",
    });
  });

  it("deaggregates cities at close zoom", () => {
    const groups = groupGlobeClusters(clusters, GLOBE_MIN_ZOOM_SCALE);

    expect(groups).toHaveLength(3);
    expect(groups.every((group) => group.cityKeys.length === 1)).toBe(true);
  });

  it("increases the geographic grouping radius while zooming out", () => {
    expect(globeClusterRadius(GLOBE_MAX_ZOOM_SCALE)).toBeGreaterThan(
      globeClusterRadius(1),
    );
    expect(globeClusterRadius(1)).toBeGreaterThan(
      globeClusterRadius(GLOBE_MIN_ZOOM_SCALE),
    );
  });
});
