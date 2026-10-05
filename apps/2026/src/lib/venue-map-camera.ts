export interface MapCameraView {
  centerX: number;
  centerY: number;
  zoom: number;
}

interface MapBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FitMapBoundsOptions {
  /** Geometry bounds in map coordinates, after any floor rotation. */
  bounds: MapBounds;
  /** Actual SVG dimensions in screen pixels. */
  viewport: { width: number; height: number };
  canvasHeight: number;
  /** Screen pixels covered by map controls or an open sheet. */
  insets?: Partial<Record<"top" | "right" | "bottom" | "left", number>>;
  padding?: number;
  maxZoom?: number;
}

/** Returns null while the viewport or its unobscured area cannot be measured. */
export function fitMapBounds({
  bounds,
  viewport,
  canvasHeight,
  insets = {},
  padding = 16,
  maxZoom = 3.8,
}: FitMapBoundsOptions): MapCameraView | null {
  const { top = 0, right = 0, bottom = 0, left = 0 } = insets;
  const positiveDimensions = [
    bounds.width,
    bounds.height,
    viewport.width,
    viewport.height,
    canvasHeight,
    maxZoom,
  ];
  if (
    ![bounds.x, bounds.y].every(Number.isFinite) ||
    !positiveDimensions.every((value) => Number.isFinite(value) && value > 0) ||
    ![top, right, bottom, left, padding].every(
      (value) => Number.isFinite(value) && value >= 0,
    )
  )
    return null;

  const availableWidth = viewport.width - left - right - padding * 2;
  const availableHeight = viewport.height - top - bottom - padding * 2;
  if (availableWidth <= 0 || availableHeight <= 0) return null;

  const pixelsPerMapUnit = Math.min(
    availableWidth / bounds.width,
    availableHeight / bounds.height,
    (maxZoom * viewport.height) / canvasHeight,
  );

  // viewBox height is canvasHeight / zoom. Shift its center by the obscured
  // screen-space imbalance so the geometry sits in the remaining visible area.
  const view = {
    centerX:
      bounds.x + bounds.width / 2 + (right - left) / (2 * pixelsPerMapUnit),
    centerY:
      bounds.y + bounds.height / 2 + (bottom - top) / (2 * pixelsPerMapUnit),
    zoom: (pixelsPerMapUnit * canvasHeight) / viewport.height,
  };
  return Object.values(view).every(Number.isFinite) ? view : null;
}

interface ConstrainIndoorViewOptions {
  view: MapCameraView;
  fittedView: MapCameraView;
  aspect: number;
  canvasHeight: number;
  maxZoom?: number;
}

/** Keep pans inside the fitted overview, including its off-center framing. */
export function constrainIndoorView({
  view,
  fittedView,
  aspect,
  canvasHeight,
  maxZoom = 3.8,
}: ConstrainIndoorViewOptions): MapCameraView {
  const zoom = Math.max(fittedView.zoom, Math.min(view.zoom, maxZoom));
  const verticalTravel = Math.max(
    0,
    (canvasHeight / fittedView.zoom - canvasHeight / zoom) / 2,
  );
  const horizontalTravel = verticalTravel * aspect;
  return {
    centerX: Math.min(
      Math.max(view.centerX, fittedView.centerX - horizontalTravel),
      fittedView.centerX + horizontalTravel,
    ),
    centerY: Math.min(
      Math.max(view.centerY, fittedView.centerY - verticalTravel),
      fittedView.centerY + verticalTravel,
    ),
    zoom,
  };
}
