import * as THREE from "three";

import type { GlobeCluster } from "./guild-globe";

export const GLOBE_MIN_ZOOM_SCALE = 0.42;
export const GLOBE_MAX_ZOOM_SCALE = 1.5;

const EARTH_RADIUS_KM = 6371;
const MINIMUM_CLUSTER_RADIUS_KM = 8;
const MAXIMUM_CLUSTER_RADIUS_KM = 1260;

export interface GlobeMarkerGroup {
  cityKeys: string[];
  count: number;
  key: string;
  label: string;
  latitude: number;
  longitude: number;
  primaryKey: string;
  profiles: GlobeCluster["profiles"];
}

function greatCircleDistance(first: GlobeCluster, second: GlobeCluster) {
  const firstLatitude = THREE.MathUtils.degToRad(first.latitude);
  const secondLatitude = THREE.MathUtils.degToRad(second.latitude);
  const latitudeDelta = secondLatitude - firstLatitude;
  const longitudeDelta = THREE.MathUtils.degToRad(
    second.longitude - first.longitude,
  );
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  const normalizedHaversine = THREE.MathUtils.clamp(haversine, 0, 1);
  return (
    EARTH_RADIUS_KM *
    2 *
    Math.atan2(
      Math.sqrt(normalizedHaversine),
      Math.sqrt(1 - normalizedHaversine),
    )
  );
}

export function globeClusterRadius(zoomScale: number) {
  const normalized = THREE.MathUtils.clamp(
    (zoomScale - GLOBE_MIN_ZOOM_SCALE) /
      (GLOBE_MAX_ZOOM_SCALE - GLOBE_MIN_ZOOM_SCALE),
    0,
    1,
  );
  return (
    MINIMUM_CLUSTER_RADIUS_KM *
    Math.pow(MAXIMUM_CLUSTER_RADIUS_KM / MINIMUM_CLUSTER_RADIUS_KM, normalized)
  );
}

function geographicCenter(group: readonly GlobeCluster[]) {
  const vector = group.reduce(
    (center, cluster) => {
      const latitude = THREE.MathUtils.degToRad(cluster.latitude);
      const longitude = THREE.MathUtils.degToRad(cluster.longitude);
      const weight = Math.max(cluster.count, 1);
      center.x += Math.cos(latitude) * Math.cos(longitude) * weight;
      center.y += Math.cos(latitude) * Math.sin(longitude) * weight;
      center.z += Math.sin(latitude) * weight;
      return center;
    },
    { x: 0, y: 0, z: 0 },
  );
  return {
    latitude: THREE.MathUtils.radToDeg(
      Math.atan2(vector.z, Math.hypot(vector.x, vector.y)),
    ),
    longitude: THREE.MathUtils.radToDeg(Math.atan2(vector.y, vector.x)),
  };
}

export function groupGlobeClusters(
  clusters: readonly GlobeCluster[],
  zoomScale: number,
): GlobeMarkerGroup[] {
  const parents = clusters.map((_, index) => index);
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
  const radius = globeClusterRadius(zoomScale);

  for (let first = 0; first < clusters.length; first += 1) {
    for (let second = first + 1; second < clusters.length; second += 1) {
      const firstCluster = clusters[first];
      const secondCluster = clusters[second];
      if (
        firstCluster &&
        secondCluster &&
        greatCircleDistance(firstCluster, secondCluster) <= radius
      ) {
        union(first, second);
      }
    }
  }

  const grouped = new Map<number, GlobeCluster[]>();
  clusters.forEach((cluster, index) => {
    const root = find(index);
    const group = grouped.get(root) ?? [];
    group.push(cluster);
    grouped.set(root, group);
  });

  return [...grouped.values()]
    .map((group) => {
      const ordered = [...group].sort(
        (first, second) =>
          second.count - first.count || first.label.localeCompare(second.label),
      );
      const primary = ordered[0];
      if (!primary) throw new Error("A globe marker group cannot be empty.");
      const cityKeys = group.map((cluster) => cluster.key).sort();
      const count = group.reduce((total, cluster) => total + cluster.count, 0);
      return {
        ...geographicCenter(group),
        cityKeys,
        count,
        key: cityKeys.join("+"),
        label:
          group.length === 1
            ? primary.label
            : `${count} members across ${group.length} nearby cities`,
        primaryKey: primary.key,
        profiles: group.flatMap((cluster) => cluster.profiles),
      };
    })
    .sort(
      (first, second) =>
        second.count - first.count || first.key.localeCompare(second.key),
    );
}
