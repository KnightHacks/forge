import type { FlatMapView } from "./flat-map-projection";
import type { GlobeMarkerGroup } from "./globe-clustering";
import type { GlobeCluster } from "./guild-globe";
import {
  projectFlatMapCoordinate,
  unprojectFlatMapCoordinate,
} from "./flat-map-projection";

const DEFAULT_MARKER_SEPARATION = 58;

export function groupFlatMapClusters(
  clusters: readonly GlobeCluster[],
  view: FlatMapView,
  markerSeparation = DEFAULT_MARKER_SEPARATION,
): GlobeMarkerGroup[] {
  const projected = clusters.map((cluster) => ({
    cluster,
    point: projectFlatMapCoordinate(cluster.longitude, cluster.latitude, view),
  }));
  const parents = projected.map((_, index) => index);
  const find = (index: number): number => {
    const parent = parents[index];
    if (parent === undefined || parent === index) return index;
    const root = find(parent);
    parents[index] = root;
    return root;
  };
  const union = (first: number, second: number) => {
    const firstRoot = find(first);
    const secondRoot = find(second);
    if (firstRoot !== secondRoot) parents[secondRoot] = firstRoot;
  };

  for (let first = 0; first < projected.length; first += 1) {
    for (let second = first + 1; second < projected.length; second += 1) {
      const firstPoint = projected[first]?.point;
      const secondPoint = projected[second]?.point;
      if (
        firstPoint &&
        secondPoint &&
        Math.hypot(secondPoint.x - firstPoint.x, secondPoint.y - firstPoint.y) <
          markerSeparation
      ) {
        union(first, second);
      }
    }
  }

  const grouped = new Map<number, (typeof projected)[number][]>();
  projected.forEach((candidate, index) => {
    const root = find(index);
    const group = grouped.get(root) ?? [];
    group.push(candidate);
    grouped.set(root, group);
  });

  return [...grouped.values()].map((group) => {
    const ordered = [...group].sort(
      (first, second) =>
        second.cluster.count - first.cluster.count ||
        first.cluster.label.localeCompare(second.cluster.label),
    );
    const primary = ordered[0]?.cluster;
    if (!primary) throw new Error("A flat map marker group cannot be empty.");
    const count = group.reduce(
      (total, candidate) => total + candidate.cluster.count,
      0,
    );
    const weightedPoint = group.reduce(
      (center, candidate) => {
        const weight = Math.max(candidate.cluster.count, 1);
        return {
          weight: center.weight + weight,
          x: center.x + candidate.point.x * weight,
          y: center.y + candidate.point.y * weight,
        };
      },
      { weight: 0, x: 0, y: 0 },
    );
    const center = unprojectFlatMapCoordinate(
      weightedPoint.x / Math.max(weightedPoint.weight, 1),
      weightedPoint.y / Math.max(weightedPoint.weight, 1),
      view,
    );
    const cityKeys = group.map((candidate) => candidate.cluster.key).sort();

    return {
      cityKeys,
      count,
      key: cityKeys.join("+"),
      label:
        group.length === 1
          ? primary.label
          : `${count} members across ${group.length} nearby cities`,
      latitude: center.latitude,
      longitude: center.longitude,
      primaryKey: primary.key,
      profiles: group.flatMap((candidate) => candidate.cluster.profiles),
    };
  });
}
