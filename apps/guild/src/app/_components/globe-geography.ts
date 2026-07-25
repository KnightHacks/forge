import { mesh } from "topojson-client";
import worldTopologySource from "world-atlas/countries-110m.json";

type WorldTopology = Parameters<typeof mesh>[0];
type WorldGeometry = NonNullable<Parameters<typeof mesh>[1]>;

const worldTopology = worldTopologySource as unknown as WorldTopology;
const countryGeometry = worldTopology.objects.countries as WorldGeometry;
const landGeometry = worldTopology.objects.land as WorldGeometry;

export const globeCoastlines = mesh(worldTopology, landGeometry).coordinates;
export const globeCountryBoundaries = mesh(
  worldTopology,
  countryGeometry,
  (left, right) => left !== right,
).coordinates;

const placeholderCenter = {
  latitude: 18,
  longitude: -88,
};

export function projectGlobeCoordinate(
  longitude: number,
  latitude: number,
  radius = 252,
) {
  const lambda = ((longitude - placeholderCenter.longitude) * Math.PI) / 180;
  const phi = (latitude * Math.PI) / 180;
  const phiZero = (placeholderCenter.latitude * Math.PI) / 180;
  const visibility =
    Math.sin(phiZero) * Math.sin(phi) +
    Math.cos(phiZero) * Math.cos(phi) * Math.cos(lambda);

  return {
    visible: visibility >= 0,
    x: 300 + radius * Math.cos(phi) * Math.sin(lambda),
    y:
      300 -
      radius *
        (Math.cos(phiZero) * Math.sin(phi) -
          Math.sin(phiZero) * Math.cos(phi) * Math.cos(lambda)),
  };
}

export function globePath(outlines: number[][][], radius = 252): string {
  const segments: string[] = [];

  for (const outline of outlines) {
    let drawing = false;
    for (const [longitude, latitude] of outline) {
      if (longitude === undefined || latitude === undefined) continue;
      const point = projectGlobeCoordinate(longitude, latitude, radius);
      if (!point.visible) {
        drawing = false;
        continue;
      }
      segments.push(
        `${drawing ? "L" : "M"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
      );
      drawing = true;
    }
  }

  return segments.join(" ");
}
