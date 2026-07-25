"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import type { GlobeMarkerGroup } from "./globe-clustering";
import type { GlobeCluster } from "./guild-globe";
import { groupFlatMapClusters } from "./flat-map-clustering";
import {
  flatMapCountyBoundaries,
  flatMapStateBoundaries,
} from "./flat-map-geography";
import {
  FLAT_MAP_MAX_ZOOM,
  FLAT_MAP_MIN_ZOOM,
  flatMapPath,
  normalizeLongitude,
  positionFlatMapCoordinate,
  projectFlatMapCoordinate,
  unprojectFlatMapCoordinate,
  zoomFlatMapAtPoint,
} from "./flat-map-projection";
import { globeCoastlines, globeCountryBoundaries } from "./globe-geography";
import { GuildLocationMarker } from "./guild-location-marker";

const MAP_ENTRY_ZOOM = 1.15;
const RETURN_TO_GLOBE_ZOOM = 0.88;

export function FlatMapRenderer({
  clusters,
  focus,
  onReturnToGlobe,
  onSelect,
}: {
  clusters: GlobeCluster[];
  focus: GlobeMarkerGroup;
  onReturnToGlobe: () => void;
  onSelect: (key: string) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({
    centerLatitude: focus.latitude,
    centerLongitude: focus.longitude,
    height: 600,
    width: 1000,
    zoom: MAP_ENTRY_ZOOM,
  });
  const viewRef = useRef(view);
  const markerGroups = useMemo(
    () => groupFlatMapClusters(clusters, view),
    [clusters, view],
  );

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const resize = () => {
      setView((current) => {
        const next = {
          ...current,
          height: Math.max(stage.clientHeight, 1),
          width: Math.max(stage.clientWidth, 1),
        };
        viewRef.current = next;
        return next;
      });
    };
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    resize();
    return () => observer.disconnect();
  }, []);

  const changeZoom = useCallback(
    (factor: number, clientX?: number, clientY?: number) => {
      const bounds = stageRef.current?.getBoundingClientRect();
      setView((current) => {
        const requestedZoom = current.zoom * factor;
        if (requestedZoom < RETURN_TO_GLOBE_ZOOM) {
          window.requestAnimationFrame(onReturnToGlobe);
          return current;
        }
        const nextZoom = Math.max(
          FLAT_MAP_MIN_ZOOM,
          Math.min(FLAT_MAP_MAX_ZOOM, requestedZoom),
        );
        const x =
          clientX !== undefined && bounds
            ? clientX - bounds.left
            : current.width / 2;
        const y =
          clientY !== undefined && bounds
            ? clientY - bounds.top
            : current.height / 2;
        const next = zoomFlatMapAtPoint(current, nextZoom, x, y);
        viewRef.current = next;
        return next;
      });
    },
    [onReturnToGlobe],
  );

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const pointers = new Map<number, { clientX: number; clientY: number }>();
    let drag:
      | {
          centerLatitude: number;
          centerLongitude: number;
          clientX: number;
          clientY: number;
        }
      | undefined;
    let pinch:
      | {
          anchorLatitude: number;
          anchorLongitude: number;
          centerLatitude: number;
          centerLongitude: number;
          distance: number;
          zoom: number;
        }
      | undefined;
    const commitView = (
      next: typeof view | ((current: typeof view) => typeof view),
    ) => {
      setView((current) => {
        const resolved = typeof next === "function" ? next(current) : next;
        viewRef.current = resolved;
        return resolved;
      });
    };
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      changeZoom(
        Math.exp(-event.deltaY * 0.0018),
        event.clientX,
        event.clientY,
      );
    };
    const handlePointerDown = (event: PointerEvent) => {
      if ((event.target as HTMLElement).closest("[data-map-controls]")) return;
      stage.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, {
        clientX: event.clientX,
        clientY: event.clientY,
      });
      const currentView = viewRef.current;
      const activePointers = [...pointers.values()];
      if (activePointers.length === 1) {
        drag = {
          centerLatitude: currentView.centerLatitude,
          centerLongitude: currentView.centerLongitude,
          clientX: event.clientX,
          clientY: event.clientY,
        };
        pinch = undefined;
        return;
      }
      if (activePointers.length !== 2) return;
      const [first, second] = activePointers;
      if (!first || !second) return;
      const bounds = stage.getBoundingClientRect();
      const midpointX = (first.clientX + second.clientX) / 2;
      const midpointY = (first.clientY + second.clientY) / 2;
      const anchor = unprojectFlatMapCoordinate(
        midpointX - bounds.left,
        midpointY - bounds.top,
        currentView,
      );
      pinch = {
        anchorLatitude: anchor.latitude,
        anchorLongitude: anchor.longitude,
        centerLatitude: currentView.centerLatitude,
        centerLongitude: currentView.centerLongitude,
        distance: Math.hypot(
          second.clientX - first.clientX,
          second.clientY - first.clientY,
        ),
        zoom: currentView.zoom,
      };
      drag = undefined;
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, {
        clientX: event.clientX,
        clientY: event.clientY,
      });
      const activePointers = [...pointers.values()];
      const bounds = stage.getBoundingClientRect();
      if (activePointers.length >= 2 && pinch) {
        const [first, second] = activePointers;
        if (!first || !second) return;
        const distance = Math.hypot(
          second.clientX - first.clientX,
          second.clientY - first.clientY,
        );
        const requestedZoom =
          pinch.zoom * (distance / Math.max(pinch.distance, 1));
        if (requestedZoom < RETURN_TO_GLOBE_ZOOM) {
          window.requestAnimationFrame(onReturnToGlobe);
          return;
        }
        const midpointX = (first.clientX + second.clientX) / 2;
        const midpointY = (first.clientY + second.clientY) / 2;
        const nextZoom = Math.max(
          FLAT_MAP_MIN_ZOOM,
          Math.min(FLAT_MAP_MAX_ZOOM, requestedZoom),
        );
        commitView(
          positionFlatMapCoordinate(
            {
              ...viewRef.current,
              centerLatitude: pinch.centerLatitude,
              centerLongitude: pinch.centerLongitude,
              zoom: nextZoom,
            },
            pinch.anchorLongitude,
            pinch.anchorLatitude,
            midpointX - bounds.left,
            midpointY - bounds.top,
          ),
        );
        return;
      }
      if (!drag) return;
      const startingView = {
        ...viewRef.current,
        centerLatitude: drag.centerLatitude,
        centerLongitude: drag.centerLongitude,
      };
      const start = unprojectFlatMapCoordinate(
        drag.clientX - bounds.left,
        drag.clientY - bounds.top,
        startingView,
      );
      const current = unprojectFlatMapCoordinate(
        event.clientX - bounds.left,
        event.clientY - bounds.top,
        startingView,
      );
      commitView({
        ...startingView,
        centerLatitude: drag.centerLatitude + start.latitude - current.latitude,
        centerLongitude: normalizeLongitude(
          drag.centerLongitude + start.longitude - current.longitude,
        ),
      });
    };
    const handlePointerUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (stage.hasPointerCapture(event.pointerId)) {
        stage.releasePointerCapture(event.pointerId);
      }
      pinch = undefined;
      const remaining = [...pointers.values()][0];
      drag = remaining
        ? {
            centerLatitude: viewRef.current.centerLatitude,
            centerLongitude: viewRef.current.centerLongitude,
            clientX: remaining.clientX,
            clientY: remaining.clientY,
          }
        : undefined;
    };
    stage.addEventListener("wheel", handleWheel, { passive: false });
    stage.addEventListener("pointerdown", handlePointerDown);
    stage.addEventListener("pointermove", handlePointerMove);
    stage.addEventListener("pointerup", handlePointerUp);
    stage.addEventListener("pointercancel", handlePointerUp);
    return () => {
      stage.removeEventListener("wheel", handleWheel);
      stage.removeEventListener("pointerdown", handlePointerDown);
      stage.removeEventListener("pointermove", handlePointerMove);
      stage.removeEventListener("pointerup", handlePointerUp);
      stage.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [changeZoom, onReturnToGlobe]);

  const coastlinePath = useMemo(
    () => flatMapPath(globeCoastlines, view),
    [view],
  );
  const countryPath = useMemo(
    () => flatMapPath(globeCountryBoundaries, view),
    [view],
  );
  const statePath = useMemo(
    () => flatMapPath(flatMapStateBoundaries, view),
    [view],
  );
  const countyPath = useMemo(
    () => (view.zoom >= 9 ? flatMapPath(flatMapCountyBoundaries, view) : ""),
    [view],
  );
  const visibleMarkers = markerGroups
    .map((group) => ({
      group,
      point: projectFlatMapCoordinate(group.longitude, group.latitude, view),
    }))
    .filter(
      ({ point }) =>
        point.x > -70 &&
        point.x < view.width + 70 &&
        point.y > -70 &&
        point.y < view.height + 70,
    );
  const selectMarker = (group: GlobeMarkerGroup) => {
    onSelect(group.primaryKey);
    if (group.cityKeys.length > 1) {
      setView((current) => {
        const next = {
          ...current,
          centerLatitude: group.latitude,
          centerLongitude: group.longitude,
          zoom: Math.min(FLAT_MAP_MAX_ZOOM, current.zoom * 1.8),
        };
        viewRef.current = next;
        return next;
      });
    }
  };

  return (
    <motion.div
      ref={stageRef}
      data-flat-map
      data-map-marker-groups={markerGroups.length}
      data-map-zoom={view.zoom.toFixed(3)}
      data-map-center-latitude={view.centerLatitude.toFixed(5)}
      data-map-center-longitude={view.centerLongitude.toFixed(5)}
      className="absolute inset-0 z-20 cursor-grab touch-none overflow-hidden bg-[#080b16] active:cursor-grabbing"
      initial={{ opacity: 0, scale: 1.025 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.985 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      aria-label="Detailed Guild member map"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          backgroundImage:
            "linear-gradient(rgba(139,124,205,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(139,124,205,.12) 1px,transparent 1px)",
          backgroundPosition: `${view.centerLongitude * view.zoom}px ${
            view.centerLatitude * view.zoom
          }px`,
          backgroundSize: `${Math.max(28, 76 / Math.sqrt(view.zoom))}px ${Math.max(
            28,
            76 / Math.sqrt(view.zoom),
          )}px`,
        }}
      />
      <svg
        viewBox={`0 0 ${view.width} ${view.height}`}
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="flat-map-wash" cx="50%" cy="48%" r="72%">
            <stop offset="0%" stopColor="#283258" stopOpacity="0.38" />
            <stop offset="62%" stopColor="#13182a" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#080b16" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect
          width={view.width}
          height={view.height}
          fill="url(#flat-map-wash)"
        />
        <path
          d={countryPath}
          fill="none"
          stroke="#746b9f"
          strokeOpacity="0.3"
          strokeWidth={Math.max(0.55, 1.05 / Math.sqrt(view.zoom))}
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={statePath}
          fill="none"
          stroke="#8e82bf"
          strokeOpacity={view.zoom >= 5 ? 0.5 : 0.36}
          strokeWidth={0.8}
          vectorEffect="non-scaling-stroke"
        />
        {countyPath ? (
          <path
            d={countyPath}
            fill="none"
            stroke="#70688e"
            strokeOpacity="0.36"
            strokeWidth={0.58}
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
        <path
          d={coastlinePath}
          fill="none"
          stroke="#b2a3ef"
          strokeOpacity="0.88"
          strokeWidth={Math.max(0.8, 1.5 / Math.sqrt(view.zoom))}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <AnimatePresence initial>
        {visibleMarkers.map(({ group, point }) => (
          <motion.div
            key={group.key}
            className="absolute left-0 top-0"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            style={{
              left: point.x,
              top: point.y,
            }}
          >
            <GuildLocationMarker
              group={group}
              mode="map"
              onSelect={selectMarker}
              style={{ transform: "translate(-50%, -50%)" }}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      <div
        data-map-controls
        className="absolute right-3 top-3 z-30 flex overflow-hidden rounded-md border border-white/10 bg-background/85 shadow-lg backdrop-blur sm:right-4 sm:top-4"
      >
        <button
          type="button"
          className="h-10 border-r border-white/10 px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          onClick={onReturnToGlobe}
        >
          Globe
        </button>
        <button
          type="button"
          className="grid h-10 w-10 place-items-center border-r border-white/10 text-lg text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          onClick={() => changeZoom(1.55)}
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          className="grid h-10 w-10 place-items-center text-xl text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          onClick={() => changeZoom(0.64)}
          aria-label="Zoom out"
        >
          −
        </button>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-4 z-20 hidden -translate-x-1/2 rounded-full border border-white/10 bg-background/70 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur sm:block">
        Map detail · {Math.round(view.zoom * 10) / 10}×
      </div>
    </motion.div>
  );
}
