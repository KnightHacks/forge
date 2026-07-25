export const FLAT_MAP_MIN_ZOOM = 1;
export const FLAT_MAP_MAX_ZOOM = 64;

const MAX_MERCATOR_LATITUDE = 84;
const ENTRY_LONGITUDE_SPAN = 108;

export interface FlatMapView {
  centerLatitude: number;
  centerLongitude: number;
  height: number;
  width: number;
  zoom: number;
}

export function clampMapLatitude(latitude: number) {
  return Math.max(
    -MAX_MERCATOR_LATITUDE,
    Math.min(MAX_MERCATOR_LATITUDE, latitude),
  );
}

export function normalizeLongitude(longitude: number) {
  return ((((longitude + 180) % 360) + 360) % 360) - 180;
}

function mercatorY(latitude: number) {
  const radians = (clampMapLatitude(latitude) * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + radians / 2));
}

function inverseMercatorY(value: number) {
  return clampMapLatitude((Math.atan(Math.sinh(value)) * 180) / Math.PI);
}

function pixelsPerRadian(view: FlatMapView) {
  return (
    (Math.max(view.width, 1) / ((ENTRY_LONGITUDE_SPAN * Math.PI) / 180)) *
    view.zoom
  );
}

export function projectFlatMapCoordinate(
  longitude: number,
  latitude: number,
  view: FlatMapView,
) {
  const longitudeDelta =
    (normalizeLongitude(longitude - view.centerLongitude) * Math.PI) / 180;
  const scale = pixelsPerRadian(view);
  return {
    x: view.width / 2 + longitudeDelta * scale,
    y:
      view.height / 2 -
      (mercatorY(latitude) - mercatorY(view.centerLatitude)) * scale,
  };
}

export function unprojectFlatMapCoordinate(
  x: number,
  y: number,
  view: FlatMapView,
) {
  const scale = pixelsPerRadian(view);
  return {
    latitude: inverseMercatorY(
      mercatorY(view.centerLatitude) + (view.height / 2 - y) / scale,
    ),
    longitude: normalizeLongitude(
      view.centerLongitude + (((x - view.width / 2) / scale) * 180) / Math.PI,
    ),
  };
}

export function flatMapPath(outlines: number[][][], view: FlatMapView): string {
  const segments: string[] = [];

  for (const outline of outlines) {
    let previousX: number | null = null;
    for (const [longitude, latitude] of outline) {
      if (longitude === undefined || latitude === undefined) continue;
      const point = projectFlatMapCoordinate(longitude, latitude, view);
      const wrapped =
        previousX !== null && Math.abs(point.x - previousX) > view.width * 0.6;
      const outside =
        point.x < -view.width ||
        point.x > view.width * 2 ||
        point.y < -view.height ||
        point.y > view.height * 2;
      segments.push(
        `${previousX === null || wrapped || outside ? "M" : "L"}${point.x.toFixed(
          2,
        )} ${point.y.toFixed(2)}`,
      );
      previousX = outside ? null : point.x;
    }
  }

  return segments.join(" ");
}

export function zoomFlatMapAtPoint(
  view: FlatMapView,
  nextZoom: number,
  x: number,
  y: number,
): FlatMapView {
  const anchor = unprojectFlatMapCoordinate(x, y, view);
  return positionFlatMapCoordinate(
    { ...view, zoom: nextZoom },
    anchor.longitude,
    anchor.latitude,
    x,
    y,
  );
}

export function positionFlatMapCoordinate(
  view: FlatMapView,
  longitude: number,
  latitude: number,
  x: number,
  y: number,
): FlatMapView {
  const scale = pixelsPerRadian(view);
  return {
    ...view,
    centerLatitude: inverseMercatorY(
      mercatorY(latitude) + (y - view.height / 2) / scale,
    ),
    centerLongitude: normalizeLongitude(
      longitude - (((x - view.width / 2) / scale) * 180) / Math.PI,
    ),
  };
}
