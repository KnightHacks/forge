import { describe, expect, it } from "vitest";

import type { GlobeCluster } from "../app/_components/guild-globe";
import { groupFlatMapClusters } from "../app/_components/flat-map-clustering";

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
    count: 2,
    key: "santa-clara",
    label: "Santa Clara, CA",
    latitude: 37.3541,
    longitude: -121.9552,
    name: "Santa Clara",
    profiles: [],
    state: "CA",
  },
] satisfies GlobeCluster[];

const view = {
  centerLatitude: 37.6,
  centerLongitude: -122.2,
  height: 600,
  width: 1000,
  zoom: 1.15,
};

describe("flat map marker clustering", () => {
  it("combines cities whose profile markers would overlap", () => {
    const groups = groupFlatMapClusters(clusters, view);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      cityKeys: ["san-francisco", "santa-clara"],
      count: 4,
    });
  });

  it("deaggregates those cities as the map reaches metro scale", () => {
    const groups = groupFlatMapClusters(clusters, { ...view, zoom: 16 });

    expect(groups).toHaveLength(2);
    expect(groups.every((group) => group.cityKeys.length === 1)).toBe(true);
  });
});
