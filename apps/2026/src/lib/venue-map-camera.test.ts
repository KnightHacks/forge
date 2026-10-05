import { describe, expect, it } from "vitest";

import type { FitMapBoundsOptions, MapCameraView } from "./venue-map-camera";
import { constrainIndoorView, fitMapBounds } from "./venue-map-camera";

function projectPoint(
  point: { x: number; y: number },
  view: MapCameraView,
  options: FitMapBoundsOptions,
) {
  const scale = (options.viewport.height * view.zoom) / options.canvasHeight;
  return {
    x: options.viewport.width / 2 + (point.x - view.centerX) * scale,
    y: options.viewport.height / 2 + (point.y - view.centerY) * scale,
  };
}

const floorBounds = { x: 100, y: 100, width: 800, height: 600 };

describe("map camera fitting", () => {
  it.each([
    {
      name: "a narrow phone with a bottom event dock",
      viewport: { width: 320, height: 640 },
      insets: { top: 64, bottom: 128, left: 8, right: 8 },
    },
    {
      name: "a tall phone with an expanded event dock",
      viewport: { width: 390, height: 844 },
      insets: { top: 64, bottom: 380, left: 8, right: 8 },
    },
    {
      name: "a wide viewport with controls on the right",
      viewport: { width: 1200, height: 500 },
      insets: { top: 60, bottom: 80, left: 0, right: 200 },
    },
  ])("keeps all floor corners visible on $name", ({ viewport, insets }) => {
    const options = {
      bounds: floorBounds,
      viewport,
      insets,
      canvasHeight: 700,
    };
    const view = fitMapBounds(options);
    expect(view).not.toBeNull();
    if (!view) return;

    const corners = [
      { x: 100, y: 100 },
      { x: 900, y: 100 },
      { x: 100, y: 700 },
      { x: 900, y: 700 },
    ].map((point) => projectPoint(point, view, options));
    for (const corner of corners) {
      expect(corner.x).toBeGreaterThanOrEqual(insets.left + 16 - 0.0001);
      expect(corner.x).toBeLessThanOrEqual(
        viewport.width - insets.right - 16 + 0.0001,
      );
      expect(corner.y).toBeGreaterThanOrEqual(insets.top + 16 - 0.0001);
      expect(corner.y).toBeLessThanOrEqual(
        viewport.height - insets.bottom - 16 + 0.0001,
      );
    }

    const center = projectPoint({ x: 500, y: 400 }, view, options);
    expect(center.x).toBeCloseTo(
      (insets.left + viewport.width - insets.right) / 2,
    );
    expect(center.y).toBeCloseTo(
      (insets.top + viewport.height - insets.bottom) / 2,
    );
  });

  it("fits an extended floor canvas without stretching its geometry", () => {
    const options = {
      bounds: { x: -100, y: -30, width: 1200, height: 980 },
      viewport: { width: 390, height: 844 },
      canvasHeight: 980,
      insets: { top: 64, bottom: 128 },
      padding: 15,
    };
    const view = fitMapBounds(options);
    expect(view).not.toBeNull();
    if (!view) return;

    const corner = projectPoint({ x: -100, y: -30 }, view, options);
    const opposite = projectPoint({ x: 1100, y: 950 }, view, options);
    expect(corner.x).toBeCloseTo(15);
    expect(opposite.x).toBeCloseTo(375);
    expect((opposite.x - corner.x) / (opposite.y - corner.y)).toBeCloseTo(
      1200 / 980,
    );
  });

  it("caps magnification for a small room while keeping it clear of a sheet", () => {
    const options = {
      bounds: { x: 480, y: 380, width: 40, height: 40 },
      viewport: { width: 800, height: 600 },
      canvasHeight: 700,
      insets: { bottom: 200 },
      maxZoom: 2,
    };
    const view = fitMapBounds(options);
    expect(view?.zoom).toBe(2);
    if (!view) return;
    const center = projectPoint({ x: 500, y: 400 }, view, options);
    expect(center.x).toBeCloseTo(400);
    expect(center.y).toBeCloseTo(200);
  });

  it.each<Partial<FitMapBoundsOptions>>([
    { viewport: { width: 0, height: 600 } },
    { viewport: { width: 800, height: Number.NaN } },
    { bounds: { ...floorBounds, width: 0 } },
    { bounds: { ...floorBounds, x: Number.POSITIVE_INFINITY } },
    { canvasHeight: 0 },
    { insets: { bottom: 600 } },
    { insets: { left: -10 } },
    { padding: Number.NaN },
    { maxZoom: 0 },
  ])("does not create an invalid viewBox for %j", (override) => {
    expect(
      fitMapBounds({
        bounds: floorBounds,
        viewport: { width: 800, height: 600 },
        canvasHeight: 700,
        ...override,
      }),
    ).toBeNull();
  });
});

describe("indoor pan and zoom limits", () => {
  const fittedView = { centerX: 480, centerY: 520, zoom: 0.5 };
  const options = { fittedView, aspect: 0.5, canvasHeight: 700 };

  it("returns to the fitted overview instead of jumping to canvas center", () => {
    expect(
      constrainIndoorView({
        ...options,
        view: { centerX: -100, centerY: 900, zoom: 0.1 },
      }),
    ).toEqual(fittedView);
  });

  it("keeps a zoomed view within the overview on both axes", () => {
    const view = constrainIndoorView({
      ...options,
      view: { centerX: 2000, centerY: -1000, zoom: 1 },
    });
    // At 2x magnification, a 350x700 view fits inside the 700x1400 overview.
    expect(view).toEqual({ centerX: 655, centerY: 170, zoom: 1 });
    expect(view.centerX + 175).toBe(fittedView.centerX + 350);
    expect(view.centerY - 350).toBe(fittedView.centerY - 700);
  });

  it("preserves a valid pan and limits excess zoom", () => {
    const view = { centerX: 510, centerY: 600, zoom: 2 };
    expect(constrainIndoorView({ ...options, view })).toEqual(view);
    expect(
      constrainIndoorView({ ...options, view: { ...view, zoom: 10 } }).zoom,
    ).toBe(3.8);
  });
});
