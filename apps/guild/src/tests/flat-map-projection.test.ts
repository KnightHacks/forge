import { describe, expect, it } from "vitest";

import {
  flatMapPath,
  projectFlatMapCoordinate,
  unprojectFlatMapCoordinate,
  zoomFlatMapAtPoint,
} from "../app/_components/flat-map-projection";

const bayAreaView = {
  centerLatitude: 37.6,
  centerLongitude: -122.2,
  height: 600,
  width: 1000,
  zoom: 1,
};

describe("Guild flat map projection", () => {
  it("separates nearby cities as the detailed map zooms in", () => {
    const sanFrancisco = projectFlatMapCoordinate(
      -122.4194,
      37.7749,
      bayAreaView,
    );
    const santaClara = projectFlatMapCoordinate(
      -121.9552,
      37.3541,
      bayAreaView,
    );
    const entryDistance = Math.hypot(
      sanFrancisco.x - santaClara.x,
      sanFrancisco.y - santaClara.y,
    );
    const closeView = { ...bayAreaView, zoom: 32 };
    const closeSanFrancisco = projectFlatMapCoordinate(
      -122.4194,
      37.7749,
      closeView,
    );
    const closeSantaClara = projectFlatMapCoordinate(
      -121.9552,
      37.3541,
      closeView,
    );
    const closeDistance = Math.hypot(
      closeSanFrancisco.x - closeSantaClara.x,
      closeSanFrancisco.y - closeSantaClara.y,
    );

    expect(closeDistance).toBeGreaterThan(entryDistance * 30);
    expect(closeDistance).toBeGreaterThan(180);
  });

  it("keeps the coordinate below the cursor fixed while zooming", () => {
    const pointer = { x: 700, y: 180 };
    const anchor = unprojectFlatMapCoordinate(
      pointer.x,
      pointer.y,
      bayAreaView,
    );
    const zoomed = zoomFlatMapAtPoint(bayAreaView, 8, pointer.x, pointer.y);
    const projected = projectFlatMapCoordinate(
      anchor.longitude,
      anchor.latitude,
      zoomed,
    );

    expect(projected.x).toBeCloseTo(pointer.x, 5);
    expect(projected.y).toBeCloseTo(pointer.y, 5);
  });

  it("breaks paths that cross the antimeridian", () => {
    const path = flatMapPath(
      [
        [
          [179, 10],
          [-179, 10],
        ],
      ],
      {
        centerLatitude: 0,
        centerLongitude: 0,
        height: 600,
        width: 1000,
        zoom: 1,
      },
    );

    expect(path.match(/M/g)).toHaveLength(2);
    expect(path).not.toContain("L");
  });
});
