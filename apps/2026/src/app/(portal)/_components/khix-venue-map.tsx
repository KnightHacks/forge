"use client";

import type { KeyboardEvent, PointerEvent } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  LocateFixed,
  MapPinned,
  Minus,
  Navigation,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";

import type { HackerMapConfigurationDto as MapConfiguration } from "@forge/hacker-sdk";
import { useHackerMapConfiguration } from "@forge/hacker-sdk/react";
import { Button } from "@forge/ui/button";

import type { IndoorBuildingId } from "~/lib/venue-floor-plans";
import type {
  CampusBuildingId,
  MapPoint,
  PlottedScheduleEvent,
} from "~/lib/venue-map";
import { useHackerDashboardFlow } from "~/lib/hacker-portal";
import { useMapAccess } from "~/lib/use-map-access";
import {
  UCF_CAMPUS_ROADS,
  UCF_CAMPUS_WALKWAYS,
  UCF_CAMPUS_WATER,
} from "~/lib/venue-campus-lines.generated";
import {
  findVenueRoom,
  getVenueFloorPlan,
  getVenueFloors,
  INDOOR_BUILDING_IDS,
} from "~/lib/venue-floor-plans";
import {
  CAMPUS_BUILDINGS,
  plotScheduleEvents,
  projectCampusCoordinates,
} from "~/lib/venue-map";
import { constrainIndoorView, fitMapBounds } from "~/lib/venue-map-camera";
import {
  getRoomPresentation,
  isWayfindingLabel,
} from "~/lib/venue-room-access";
import {
  isKhixEventRoom,
  KHIX_EVENT_ROOMS,
  resolveRoomNumber,
  roomMatchesNumber,
} from "~/lib/venue-room-directory";
import { MapEventsDock } from "./khix-map-events";
import styles from "./khix-venue-map.module.css";

const CAMPUS_MAP_HEIGHT = 700;
const ENG2_MAP_HEIGHT = 980;
const FULL_VIEW = { centerX: 500, centerY: CAMPUS_MAP_HEIGHT / 2, zoom: 1 };
const MIN_ZOOM = 1;
const MAX_ZOOM = 3.8;
const FLOOR_ENTRY_ZOOM = 3.15;
const SCHEDULE_REFRESH_MS = 30_000;
const EVENT_PARKING = {
  id: "ucf-83",
  // Center the callout inside Garage C's footprint.
  center: { x: 894, y: 316 },
};
const FLOOR_ROTATION: Record<IndoorBuildingId, number> = {
  ba1: 2,
  ba2: -26,
  eng1: 70,
  hec: 0,
  "student-union": 0,
  "ucf-91": 0,
};

const LABELED_BUILDING_IDS = new Set<CampusBuildingId>([
  "ba1",
  "ba2",
  "eng1",
  "hec",
  "student-union",
  "ucf-91",
  EVENT_PARKING.id,
]);

type MapFilter = "live" | "upcoming";
type MapView = typeof FULL_VIEW;

interface IndoorSpot {
  buildingId: IndoorBuildingId;
  room: string;
}

interface ActiveFloor {
  buildingId: IndoorBuildingId;
  floor: number;
}

interface Gesture {
  distance?: number;
  mode: "pan" | "pinch";
  originCenterX: number;
  originCenterY: number;
  originZoom: number;
  startX: number;
  startY: number;
}

function canvasHeightForBuilding(
  buildingId?: IndoorBuildingId | null,
  floor = 1,
) {
  return buildingId === "ucf-91" && floor === 1
    ? ENG2_MAP_HEIGHT
    : CAMPUS_MAP_HEIGHT;
}

function fullViewForBuilding(
  buildingId?: IndoorBuildingId | null,
  floor = 1,
  aspect = 1000 / 700,
): MapView {
  if (!buildingId) return FULL_VIEW;
  const canvasHeight = canvasHeightForBuilding(buildingId, floor);
  const angle = (FLOOR_ROTATION[buildingId] * Math.PI) / 180;
  const width =
    Math.abs(1000 * Math.cos(angle)) + Math.abs(canvasHeight * Math.sin(angle));
  const height =
    Math.abs(1000 * Math.sin(angle)) + Math.abs(canvasHeight * Math.cos(angle));
  const baseHeight = Math.max(canvasHeight, 1000 / aspect);
  // Leave space for the floor toolbar and collapsed event sheet on phones.
  const zoom = Math.min(
    (baseHeight * aspect) / (width * 1.18),
    baseHeight / (height * 1.35),
  );
  return { centerX: 500, centerY: canvasHeight / 2, zoom };
}

function viewDimensions(
  view: MapView,
  aspect: number,
  canvasHeight = CAMPUS_MAP_HEIGHT,
) {
  const height = canvasHeight / view.zoom;
  const width = height * aspect;

  return { height, width };
}

function constrainCenter(center: number, viewSize: number, canvasSize: number) {
  if (viewSize >= canvasSize) return canvasSize / 2;
  return Math.min(Math.max(center, viewSize / 2), canvasSize - viewSize / 2);
}

function constrainView(
  view: MapView,
  aspect: number,
  canvasHeight = CAMPUS_MAP_HEIGHT,
): MapView {
  const zoom = Math.min(Math.max(view.zoom, 0.25), MAX_ZOOM);
  const { height, width } = viewDimensions(
    { ...view, zoom },
    aspect,
    canvasHeight,
  );

  return {
    centerX: constrainCenter(view.centerX, width, 1000),
    centerY: constrainCenter(view.centerY, height, canvasHeight),
    zoom,
  };
}

function viewBox(
  view: MapView,
  aspect: number,
  canvasHeight = CAMPUS_MAP_HEIGHT,
) {
  const { height, width } = viewDimensions(view, aspect, canvasHeight);
  return `${view.centerX - width / 2} ${view.centerY - height / 2} ${width} ${height}`;
}

function distance(
  left: { x: number; y: number },
  right: { x: number; y: number },
) {
  return Math.hypot(right.x - left.x, right.y - left.y);
}

function buildingLabel(buildingId: CampusBuildingId) {
  return (
    CAMPUS_BUILDINGS.find((building) => building.id === buildingId)?.label ??
    buildingId
  );
}

function mapEventSort(left: PlottedScheduleEvent, right: PlottedScheduleEvent) {
  const stateOrder = { live: 0, upcoming: 1, ended: 2 };
  return (
    stateOrder[left.state] - stateOrder[right.state] ||
    left.startDateTime.getTime() - right.startDateTime.getTime()
  );
}

function eventMatchesFilter(event: PlottedScheduleEvent, filter: MapFilter) {
  return event.state === filter;
}

function isIndoorBuildingId(
  buildingId: string | null | undefined,
): buildingId is IndoorBuildingId {
  return INDOOR_BUILDING_IDS.some((candidate) => candidate === buildingId);
}

const INDOOR_BUILDINGS = CAMPUS_BUILDINGS.filter(
  (
    building,
  ): building is (typeof CAMPUS_BUILDINGS)[number] & {
    id: IndoorBuildingId;
  } => isIndoorBuildingId(building.id),
);

export function KhixVenueMap() {
  const access = useMapAccess();
  if (access.isPending) return <MapLoadingState />;
  if (access.isError) {
    return (
      <MapMessageState
        action={() => void access.retry()}
        copy="Refresh your dashboard connection and try again."
        title="The map could not load."
      />
    );
  }
  if (!access.available) {
    return <MapMessageState copy={access.reason} title="Map locked" />;
  }
  return <AvailableVenueMap />;
}

function AvailableVenueMap() {
  const { dashboard, dashboardQuery, schedule, scheduleQuery } =
    useHackerDashboardFlow({ schedule: true });
  const mapConfigurationQuery = useHackerMapConfiguration();
  const mapReady =
    dashboardQuery.isSuccess && Boolean(mapConfigurationQuery.data);
  const [focusedRoomId, setFocusedRoomId] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const clock = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(clock);
  }, []);
  const [filter, setFilter] = useState<MapFilter>("live");
  const [eventsExpanded, setEventsExpanded] = useState(false);
  const dragged = useRef(false);
  const floorTransitionUntil = useRef(false);
  const pinchChangedFloor = useRef(false);
  const [view, setView] = useState<MapView>(FULL_VIEW);
  const [viewportAspect, setViewportAspect] = useState(1000 / 700);
  const [selectedBuildingId, setSelectedBuildingId] =
    useState<CampusBuildingId | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeFloor, setActiveFloor] = useState<ActiveFloor | null>(null);
  const [fittedFloorView, setFittedFloorView] = useState<MapView | null>(null);
  const campusReturnView = useRef<MapView>(FULL_VIEW);
  const canvasHeight = canvasHeightForBuilding(
    activeFloor?.buildingId,
    activeFloor?.floor,
  );
  const fullView =
    (activeFloor ? fittedFloorView : null) ??
    fullViewForBuilding(
      activeFloor?.buildingId,
      activeFloor?.floor,
      viewportAspect,
    );
  const [gpsPoint, setGpsPoint] = useState<MapPoint | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [indoorBuildingId, setIndoorBuildingId] =
    useState<IndoorBuildingId>("eng1");
  const [indoorRoom, setIndoorRoom] = useState("");
  const [indoorSpot, setIndoorSpot] = useState<IndoorSpot | null>(null);
  const pointerPositions = useRef(
    new globalThis.Map<number, { x: number; y: number }>(),
  );
  const gesture = useRef<Gesture | null>(null);
  const gestureBuildingId = useRef<IndoorBuildingId | null>(null);
  const wheelHandler = useRef<(event: globalThis.WheelEvent) => void>(
    () => undefined,
  );
  const mapRef = useRef<SVGSVGElement | null>(null);
  const cameraAnimationFrame = useRef(0);
  const cameraAdjusted = useRef(false);
  const mapFrameRef = useRef<HTMLDivElement | null>(null);
  const locationButtonRef = useRef<HTMLButtonElement | null>(null);
  const locationPickerRef = useRef<HTMLFormElement | null>(null);
  const legendRef = useRef<HTMLDetailsElement | null>(null);
  const [mapLayout, setMapLayout] = useState({
    width: 1000,
    height: 700,
    top: 72,
    right: 64,
    bottom: 136,
    left: 16,
  });

  useLayoutEffect(() => {
    const frame = mapFrameRef.current;
    if (!frame) return;
    const dock = frame.querySelector<HTMLElement>("[data-map-dock]");
    const toolbar = frame.querySelector<HTMLElement>("[data-map-toolbar]");
    const controls = frame.querySelector<HTMLElement>("[data-map-controls]");
    if (!dock || !toolbar || !controls) return;
    const measure = () => {
      frame.style.setProperty("--map-dock-height", `${dock.offsetHeight}px`);
      const bounds = frame.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const mobile = window.matchMedia("(max-width: 720px)").matches;
      const layout = {
        width: bounds.width,
        height: bounds.height,
        top: toolbar.getBoundingClientRect().bottom - bounds.top + 8,
        right: mobile ? 0 : controls.offsetWidth + 24,
        bottom: mobile
          ? bounds.bottom - controls.getBoundingClientRect().top + 8
          : bounds.bottom - dock.getBoundingClientRect().top + 8,
        left: 0,
      };
      setMapLayout((previous) =>
        Object.entries(layout).every(
          ([key, value]) => previous[key as keyof typeof previous] === value,
        )
          ? previous
          : layout,
      );
    };
    const observer = new ResizeObserver(measure);
    [frame, dock, toolbar, controls].forEach((element) =>
      observer.observe(element),
    );
    measure();
    return () => observer.disconnect();
  }, [mapReady]);

  useEffect(() => {
    if (showLocationPicker)
      locationPickerRef.current?.querySelector("button")?.focus();
  }, [showLocationPicker]);

  useLayoutEffect(() => {
    const map = mapRef.current;
    const floor = map?.querySelector<SVGGElement>("[data-floor-geometry]");
    if (!map || !floor || !activeFloor) return;
    const measureFloor = () => {
      const bounds = floor.getBBox();
      const angle = (FLOOR_ROTATION[activeFloor.buildingId] * Math.PI) / 180;
      const points = [
        [bounds.x, bounds.y],
        [bounds.x + bounds.width, bounds.y],
        [bounds.x, bounds.y + bounds.height],
        [bounds.x + bounds.width, bounds.y + bounds.height],
      ].map(([x = 0, y = 0]) => ({
        x: 500 + (x - 500) * Math.cos(angle) - (y - 350) * Math.sin(angle),
        y: 350 + (x - 500) * Math.sin(angle) + (y - 350) * Math.cos(angle),
      }));
      const minX = Math.min(...points.map((p) => p.x));
      const maxX = Math.max(...points.map((p) => p.x));
      const minY = Math.min(...points.map((p) => p.y));
      const maxY = Math.max(...points.map((p) => p.y));
      const fitted = fitMapBounds({
        bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
        viewport: mapLayout,
        insets: mapLayout,
        canvasHeight,
        padding: 12,
      });
      if (!fitted) return;
      setFittedFloorView(fitted);
      const room = focusedRoomId
        ? getVenueFloorPlan(
            activeFloor.buildingId,
            activeFloor.floor,
          )?.rooms.find((candidate) => candidate.id === focusedRoomId)
        : null;
      if (room && !cameraAdjusted.current) {
        const focused = fitMapBounds({
          bounds: {
            x:
              500 +
              (room.x - 500) * Math.cos(angle) -
              (room.y - 350) * Math.sin(angle),
            y:
              350 +
              (room.x - 500) * Math.sin(angle) +
              (room.y - 350) * Math.cos(angle),
            width: 1,
            height: 1,
          },
          viewport: mapLayout,
          insets: mapLayout,
          canvasHeight,
          maxZoom: 2.35,
        });
        if (focused)
          setView(
            constrainIndoorView({
              view: focused,
              fittedView: fitted,
              aspect: mapLayout.width / mapLayout.height,
              canvasHeight,
            }),
          );
      } else if (cameraAdjusted.current) {
        setView((current) =>
          constrainIndoorView({
            view: current,
            fittedView: fitted,
            aspect: mapLayout.width / mapLayout.height,
            canvasHeight,
          }),
        );
      } else if (!selectedEventId) setView(fitted);
    };
    const observer = new ResizeObserver(measureFloor);
    observer.observe(floor);
    measureFloor();
    return () => observer.disconnect();
  }, [
    activeFloor,
    viewportAspect,
    canvasHeight,
    selectedEventId,
    focusedRoomId,
    mapLayout,
  ]);

  useLayoutEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const target = viewBox(view, viewportAspect, canvasHeight)
      .split(" ")
      .map(Number);
    const from = (map.getAttribute("viewBox") ?? "").split(" ").map(Number);
    if (
      gesture.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      from.length !== 4
    ) {
      map.setAttribute("viewBox", target.join(" "));
      return;
    }
    let frame = 0;
    const start = performance.now();
    const animate = (time: number) => {
      const progress = Math.min(1, (time - start) / 220);
      const eased = 1 - Math.pow(1 - progress, 3);
      map.setAttribute(
        "viewBox",
        target
          .map(
            (value, index) =>
              (from[index] ?? value) + (value - (from[index] ?? value)) * eased,
          )
          .join(" "),
      );
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
        cameraAnimationFrame.current = frame;
      }
    };
    frame = requestAnimationFrame(animate);
    cameraAnimationFrame.current = frame;
    return () => cancelAnimationFrame(frame);
  }, [view, viewportAspect, canvasHeight, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const resize = () => {
      const bounds = map.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const aspect = bounds.width / bounds.height;
      setViewportAspect(aspect);
      if (!activeFloor)
        setView((current) => constrainView(current, aspect, canvasHeight));
    };
    const observer = new ResizeObserver(resize);
    observer.observe(map);
    resize();

    return () => observer.disconnect();
  }, [canvasHeight, mapReady, activeFloor]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleNativeWheel = (event: globalThis.WheelEvent) => {
      wheelHandler.current(event);
    };
    map.addEventListener("wheel", handleNativeWheel, { passive: false });

    return () => map.removeEventListener("wheel", handleNativeWheel);
  }, [mapReady]);

  useEffect(() => {
    if (
      dashboard?.participant?.status !== "confirmed" &&
      dashboard?.participant?.status !== "checkedin"
    )
      return;

    const refresh = window.setInterval(() => {
      setNow(new Date());
      void scheduleQuery.refetch();
    }, SCHEDULE_REFRESH_MS);

    return () => window.clearInterval(refresh);
  }, [dashboard?.participant?.status, scheduleQuery]);

  const plottedEvents = useMemo(
    () => plotScheduleEvents(schedule, now).sort(mapEventSort),
    [now, schedule],
  );
  const filteredEvents = plottedEvents.filter((event) =>
    eventMatchesFilter(event, filter),
  );
  const selectedEvent =
    plottedEvents.find((event) => event.id === selectedEventId) ?? null;
  const leaveFloor = () => {
    cameraAdjusted.current = false;
    setShowLegend(false);
    setShowLocationPicker(false);
    setActiveFloor(null);
    setFocusedRoomId(null);
    setLocationMessage(null);
    setSelectedEventId(null);
    setSelectedBuildingId(null);
    setView(campusReturnView.current);
  };

  const constrainCamera = (nextView: MapView) =>
    activeFloor
      ? constrainIndoorView({
          view: nextView,
          fittedView: fullView,
          aspect: viewportAspect,
          canvasHeight,
        })
      : constrainView(nextView, viewportAspect, canvasHeight);

  const updateZoom = (
    zoom: number,
    targetBuildingId?: IndoorBuildingId | null,
    anchor?: { clientX: number; clientY: number },
  ) => {
    if (floorTransitionUntil.current || pinchChangedFloor.current) return;
    cameraAdjusted.current = true;

    const selectedVenueId = isIndoorBuildingId(selectedBuildingId)
      ? selectedBuildingId
      : null;
    const venueId = targetBuildingId ?? selectedVenueId;
    if (
      !activeFloor &&
      venueId &&
      getVenueFloors(venueId).length > 0 &&
      zoom >= FLOOR_ENTRY_ZOOM
    ) {
      campusReturnView.current = {
        ...view,
        zoom: Math.max(1, view.zoom / 1.8),
      };
      setFittedFloorView(null);
      cameraAdjusted.current = false;
      floorTransitionUntil.current = true;
      window.setTimeout(() => {
        floorTransitionUntil.current = false;
      }, 400);
      pinchChangedFloor.current = gesture.current?.mode === "pinch";
      setActiveFloor({ buildingId: venueId, floor: 1 });
      setSelectedBuildingId(venueId);
      setSelectedEventId(null);
      setView(fullViewForBuilding(venueId, 1, viewportAspect));
      setEventsExpanded(false);
      return;
    }

    setView((current) => {
      const nextZoom = Math.min(
        Math.max(zoom, activeFloor ? fullView.zoom : MIN_ZOOM),
        MAX_ZOOM,
      );
      if (!anchor || !mapRef.current) {
        return constrainCamera({ ...current, zoom: nextZoom });
      }

      const bounds = mapRef.current.getBoundingClientRect();
      const xRatio = (anchor.clientX - bounds.left) / bounds.width;
      const yRatio = (anchor.clientY - bounds.top) / bounds.height;
      // Anchor a pinch to its starting map position so moving both fingers
      // also pans, without accumulating drift from the previous frame.
      const pinch = gesture.current?.mode === "pinch" ? gesture.current : null;
      const origin = pinch
        ? {
            centerX: pinch.originCenterX,
            centerY: pinch.originCenterY,
            zoom: pinch.originZoom,
          }
        : current;
      const originXRatio = pinch
        ? (pinch.startX - bounds.left) / bounds.width
        : xRatio;
      const originYRatio = pinch
        ? (pinch.startY - bounds.top) / bounds.height
        : yRatio;
      const currentDimensions = viewDimensions(
        origin,
        viewportAspect,
        canvasHeight,
      );
      const nextDimensions = viewDimensions(
        { ...current, zoom: nextZoom },
        viewportAspect,
        canvasHeight,
      );
      const anchorX =
        origin.centerX -
        currentDimensions.width / 2 +
        originXRatio * currentDimensions.width;
      const anchorY =
        origin.centerY -
        currentDimensions.height / 2 +
        originYRatio * currentDimensions.height;

      return constrainCamera({
        centerX: anchorX - (xRatio - 0.5) * nextDimensions.width,
        centerY: anchorY - (yRatio - 0.5) * nextDimensions.height,
        zoom: nextZoom,
      });
    });
  };

  const focusCampusBuilding = (buildingId: CampusBuildingId) => {
    const building = CAMPUS_BUILDINGS.find(
      (candidate) => candidate.id === buildingId,
    );
    if (!building) return;
    const center =
      buildingId === EVENT_PARKING.id ? EVENT_PARKING.center : building.center;
    setActiveFloor(null);
    setFocusedRoomId(null);
    setSelectedBuildingId(buildingId);
    setSelectedEventId(null);
    setView(
      constrainView(
        { centerX: center.x, centerY: center.y, zoom: 2.2 },
        viewportAspect,
      ),
    );
  };

  const focusBuilding = (buildingId: CampusBuildingId) => {
    cameraAdjusted.current = false;
    setShowLegend(false);
    setShowLocationPicker(false);
    setLocationMessage(null);
    const firstFloor = isIndoorBuildingId(buildingId)
      ? getVenueFloors(buildingId)[0]
      : undefined;
    if (isIndoorBuildingId(buildingId) && firstFloor !== undefined) {
      if (!activeFloor) campusReturnView.current = view;
      setFittedFloorView(null);
      setFocusedRoomId(null);
      setSelectedBuildingId(buildingId);
      setSelectedEventId(null);
      setActiveFloor({ buildingId, floor: firstFloor });
      setView(fullViewForBuilding(buildingId, firstFloor, viewportAspect));
      setEventsExpanded(false);
      return;
    }
    focusCampusBuilding(buildingId);
  };

  const focusRoom = (buildingId: IndoorBuildingId, roomNumber: string) => {
    if (!isKhixEventRoom(buildingId, roomNumber)) return false;
    const match = findVenueRoom(buildingId, roomNumber);
    if (!match) return false;
    cameraAdjusted.current = false;
    if (!activeFloor) campusReturnView.current = view;
    const angle = (FLOOR_ROTATION[buildingId] * Math.PI) / 180;
    const { room, floor } = match;
    setFittedFloorView(null);
    setFocusedRoomId(room.id);
    setSelectedBuildingId(buildingId);
    setSelectedEventId(null);
    setActiveFloor({ buildingId, floor });
    setView(
      constrainView(
        {
          centerX:
            500 +
            (room.x - 500) * Math.cos(angle) -
            (room.y - 350) * Math.sin(angle),
          centerY:
            350 +
            (room.x - 500) * Math.sin(angle) +
            (room.y - 350) * Math.cos(angle),
          zoom: 2.35,
        },
        viewportAspect,
        canvasHeightForBuilding(buildingId, floor),
      ),
    );
    return true;
  };

  const focusEvent = (event: PlottedScheduleEvent) => {
    setShowLegend(false);
    setShowLocationPicker(false);
    setEventsExpanded(false);
    setLocationMessage(null);
    if (
      !event.venueLocation.room ||
      !focusRoom(event.venueLocation.buildingId, event.venueLocation.room)
    ) {
      focusCampusBuilding(event.venueLocation.buildingId);
    }
    setSelectedEventId(event.id);
  };

  const handleMarkerKeyDown = (
    event: KeyboardEvent<SVGGElement>,
    action: () => void,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    action();
  };

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (pointerPositions.current.size === 0) dragged.current = false;
    cancelAnimationFrame(cameraAnimationFrame.current);
    const [x, y, width, height] = (
      event.currentTarget.getAttribute("viewBox") ?? ""
    )
      .split(" ")
      .map(Number);
    const renderedView =
      x !== undefined && y !== undefined && width && height
        ? {
            centerX: x + width / 2,
            centerY: y + height / 2,
            zoom: canvasHeight / height,
          }
        : view;
    setView(renderedView);

    const buildingId = (event.target as Element).closest<SVGGElement>(
      "[data-building-id]",
    )?.dataset.buildingId;
    if (isIndoorBuildingId(buildingId)) {
      gestureBuildingId.current = buildingId;
    } else if (pointerPositions.current.size === 0) {
      gestureBuildingId.current = null;
    }

    pointerPositions.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    const pointers = [...pointerPositions.current.values()];
    if (pointers.length === 1) {
      gesture.current = {
        mode: "pan",
        originCenterX: renderedView.centerX,
        originCenterY: renderedView.centerY,
        originZoom: renderedView.zoom,
        startX: event.clientX,
        startY: event.clientY,
      };
    } else if (pointers.length === 2) {
      const [first, second] = pointers;
      if (!first || !second) return;
      gesture.current = {
        distance: distance(first, second),
        mode: "pinch",
        originCenterX: renderedView.centerX,
        originCenterY: renderedView.centerY,
        originZoom: renderedView.zoom,
        startX: (first.x + second.x) / 2,
        startY: (first.y + second.y) / 2,
      };
    }
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (pinchChangedFloor.current) return;
    if (!pointerPositions.current.has(event.pointerId) || !gesture.current)
      return;
    pointerPositions.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    const rect = event.currentTarget.getBoundingClientRect();
    const pointers = [...pointerPositions.current.values()];
    const activeGesture = gesture.current;
    if (
      pointers.length > 1 ||
      Math.hypot(
        event.clientX - activeGesture.startX,
        event.clientY - activeGesture.startY,
      ) > 5
    ) {
      dragged.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    if (pointers.length === 2 && activeGesture.mode === "pinch") {
      const [first, second] = pointers;
      if (!first || !second || !activeGesture.distance) return;
      const nextZoom =
        activeGesture.originZoom *
        (distance(first, second) / activeGesture.distance);
      updateZoom(nextZoom, gestureBuildingId.current, {
        clientX: (first.x + second.x) / 2,
        clientY: (first.y + second.y) / 2,
      });
      return;
    }

    if (pointers.length !== 1 || activeGesture.mode !== "pan") return;
    cameraAdjusted.current = true;
    const dimensions = viewDimensions(
      { ...view, zoom: activeGesture.originZoom },
      viewportAspect,
      canvasHeight,
    );
    const scaleX = dimensions.width / rect.width;
    const scaleY = dimensions.height / rect.height;
    setView(
      constrainCamera({
        centerX:
          activeGesture.originCenterX -
          (event.clientX - activeGesture.startX) * scaleX,
        centerY:
          activeGesture.originCenterY -
          (event.clientY - activeGesture.startY) * scaleY,
        zoom: activeGesture.originZoom,
      }),
    );
  };

  const handlePointerEnd = (event: PointerEvent<SVGSVGElement>) => {
    pointerPositions.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const remaining = [...pointerPositions.current.values()];
    const first = remaining[0];
    gesture.current = first
      ? {
          mode: "pan",
          originCenterX: view.centerX,
          originCenterY: view.centerY,
          originZoom: view.zoom,
          startX: first.x,
          startY: first.y,
        }
      : null;
    if (!first) {
      gestureBuildingId.current = null;
      pinchChangedFloor.current = false;
    }
  };

  useEffect(() => {
    wheelHandler.current = (event: globalThis.WheelEvent) => {
      event.preventDefault();
      if (event.deltaY === 0) return;
      const buildingId = (event.target as Element).closest<SVGGElement>(
        "[data-building-id]",
      )?.dataset.buildingId;
      updateZoom(
        view.zoom *
          Math.exp(
            -Math.max(
              -100,
              Math.min(100, event.deltaY * (event.deltaMode === 1 ? 16 : 1)),
            ) * 0.003,
          ),
        isIndoorBuildingId(buildingId) ? buildingId : null,
        { clientX: event.clientX, clientY: event.clientY },
      );
    };
  });

  const locateUser = () => {
    setLocating(true);
    setLocationMessage(null);
    if (!("geolocation" in navigator)) {
      setLocating(false);
      setLocationMessage(
        "Location is unavailable. Choose a building and room instead.",
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = projectCampusCoordinates(
          position.coords.latitude,
          position.coords.longitude,
        );
        setLocating(false);
        if (!point) {
          setLocationMessage(
            "Your approximate position is outside this venue map. You can still set an indoor spot.",
          );
          return;
        }

        setGpsPoint(point);
        cameraAdjusted.current = false;
        setActiveFloor(null);
        setFocusedRoomId(null);
        setSelectedEventId(null);
        setShowLocationPicker(false);
        locationButtonRef.current?.focus();
        setView(
          constrainView(
            { centerX: point.x, centerY: point.y, zoom: 2.2 },
            viewportAspect,
          ),
        );
        setLocationMessage(
          "Approximate campus position found. GPS cannot identify your room or floor.",
        );
      },
      () => {
        setLocating(false);
        setLocationMessage(
          "Location was unavailable. Set your indoor spot to place yourself in a venue building.",
        );
      },
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 10_000 },
    );
  };

  const saveIndoorSpot = () => {
    const spot = {
      buildingId: indoorBuildingId,
      room: resolveRoomNumber(indoorBuildingId, indoorRoom),
    } satisfies IndoorSpot;
    const locatedRoom = spot.room && focusRoom(spot.buildingId, spot.room);
    setIndoorSpot(locatedRoom ? spot : { ...spot, room: "" });
    if (!locatedRoom) focusBuilding(spot.buildingId);
    setLocationMessage(
      spot.room && !isKhixEventRoom(spot.buildingId, spot.room)
        ? "That room isn’t part of Knight Hacks. Showing the building."
        : spot.room && !locatedRoom
          ? `${buildingLabel(spot.buildingId)} ${spot.room}: exact room location is not on this plan. Showing the building.`
          : `Indoor spot set to ${buildingLabel(spot.buildingId)}${spot.room ? ` · ${spot.room}` : ""}.`,
    );
  };

  if (dashboardQuery.isPending) {
    return (
      <>
        <h1 className={styles.srOnly}>Knight Hacks IX venue map</h1>
        <MapLoadingState />
      </>
    );
  }

  if (dashboardQuery.isError || !dashboard) {
    return (
      <>
        <h1 className={styles.srOnly}>Knight Hacks IX venue map</h1>
        <MapMessageState
          action={() => void dashboardQuery.refetch()}
          copy="Refresh the dashboard connection and try once more."
          title="The venue map could not load."
        />
      </>
    );
  }

  if (!mapConfigurationQuery.data) {
    return (
      <>
        <h1 className={styles.srOnly}>Knight Hacks IX venue map</h1>
        {mapConfigurationQuery.isError ? (
          <div role="alert" className={styles.experience}>
            <MapMessageState
              action={() => void mapConfigurationQuery.refetch()}
              actionLabel="Retry map room access"
              copy="Refresh the room access settings to load the venue map."
              title="Map room access unavailable."
            />
          </div>
        ) : (
          <MapLoadingState />
        )}
      </>
    );
  }

  return (
    <>
      <h1 className={styles.srOnly}>Knight Hacks IX venue map</h1>
      <section className={styles.experience} aria-label="Knight Hacks IX map">
        <div
          ref={mapFrameRef}
          className={styles.mapFrame}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            if (showLocationPicker) {
              setShowLocationPicker(false);
              locationButtonRef.current?.focus();
            } else if (showLegend) {
              setShowLegend(false);
              legendRef.current?.querySelector("summary")?.focus();
            }
          }}
        >
          <div
            className={styles.toolbar}
            data-map-toolbar
            aria-label="Building and floor"
          >
            {activeFloor ? (
              <>
                <button
                  aria-label="Back to campus map"
                  className={styles.backButton}
                  onClick={leaveFloor}
                  type="button"
                >
                  <ArrowLeft aria-hidden="true" />
                </button>
                <span
                  className={styles.floorTitle}
                  title={buildingLabel(activeFloor.buildingId)}
                >
                  {
                    CAMPUS_BUILDINGS.find(
                      (building) => building.id === activeFloor.buildingId,
                    )?.abbreviation
                  }
                </span>
                <div
                  className={styles.floorTabs}
                  role="group"
                  aria-label="Building floor"
                >
                  {getVenueFloors(activeFloor.buildingId).map((floor) => (
                    <button
                      key={floor}
                      aria-label={`Floor ${floor}`}
                      aria-pressed={activeFloor.floor === floor}
                      data-active={
                        activeFloor.floor === floor ? "true" : undefined
                      }
                      onClick={() => {
                        cameraAdjusted.current = false;
                        setFocusedRoomId(null);
                        setFittedFloorView(null);
                        setShowLegend(false);
                        setActiveFloor({ ...activeFloor, floor });
                        setSelectedEventId(null);
                        setView(
                          fullViewForBuilding(
                            activeFloor.buildingId,
                            floor,
                            viewportAspect,
                          ),
                        );
                      }}
                      type="button"
                    >
                      {floor}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <label className={styles.campusPicker}>
                <span className={styles.srOnly}>Choose a building</span>
                <select
                  value="campus"
                  onChange={(event) => {
                    if (isIndoorBuildingId(event.target.value))
                      focusBuilding(event.target.value);
                  }}
                >
                  <option value="campus">Campus · Choose a building</option>
                  {INDOOR_BUILDINGS.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div
            className={styles.mapControls}
            data-map-controls
            aria-label="Map controls"
          >
            <button
              aria-label="Zoom in"
              onClick={() => updateZoom(view.zoom * 1.28)}
              type="button"
            >
              <Plus aria-hidden="true" />
            </button>
            <button
              aria-label="Zoom out"
              onClick={() => updateZoom(view.zoom / 1.28)}
              type="button"
            >
              <Minus aria-hidden="true" />
            </button>
            <button
              aria-label="Reset map view"
              onClick={() => {
                cameraAdjusted.current = false;
                setFocusedRoomId(null);
                setSelectedEventId(null);
                setView(fullView);
              }}
              type="button"
            >
              <RotateCcw aria-hidden="true" />
            </button>
            <button
              ref={locationButtonRef}
              aria-label="Set my location"
              aria-expanded={showLocationPicker}
              aria-controls="map-location-picker"
              data-active={showLocationPicker ? "true" : undefined}
              onClick={() => {
                setLocationMessage(null);
                setShowLocationPicker((current) => !current);
                setShowLegend(false);
                setEventsExpanded(false);
                setSelectedEventId(null);
              }}
              type="button"
            >
              <LocateFixed aria-hidden="true" />
            </button>
          </div>

          <svg
            ref={mapRef}
            className={styles.map}
            aria-label="Interactive map of the Knight Hacks IX venue at UCF"
            onPointerCancel={handlePointerEnd}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            preserveAspectRatio="xMidYMid meet"
            role="group"
            onClickCapture={(event) => {
              if (dragged.current) {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
          >
            <defs>
              <pattern
                id="khix-map-unavailable"
                width="10"
                height="10"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(35)"
              >
                <rect width="10" height="10" fill="#25212a" />
                <path
                  d="M0 0V10"
                  stroke="#8d7b8a"
                  strokeOpacity="0.55"
                  strokeWidth="2"
                />
              </pattern>
              <radialGradient id="khix-map-glade">
                <stop offset="0" stopColor="#779c55" stopOpacity="0.18" />
                <stop offset="1" stopColor="#779c55" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="khix-map-venue" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#315e45" />
                <stop offset="1" stopColor="#17392c" />
              </linearGradient>
              <filter
                id="khix-map-glow"
                x="-80%"
                y="-80%"
                width="260%"
                height="260%"
              >
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {activeFloor ? (
              <IndoorFloorMap
                activeFloor={activeFloor}
                configuration={mapConfigurationQuery.data}
                now={now}
                events={plottedEvents}
                onSelectEvent={focusEvent}
                selectedEventId={selectedEventId}
                spot={indoorSpot}
              />
            ) : (
              <>
                <g className={styles.glades} aria-hidden="true">
                  <ellipse cx="235" cy="210" rx="285" ry="235" />
                  <ellipse cx="706" cy="411" rx="330" ry="275" />
                </g>
                <g className={styles.contours} aria-hidden="true">
                  <path d="M-80 194C156 42 394 80 516 207S792 356 1080 168" />
                  <path d="M-75 648C145 492 362 503 505 596S813 705 1082 540" />
                  <path d="M82 749C89 530 200 402 340 324S535 127 522-74" />
                </g>

                <g className={styles.campusWater} aria-hidden="true">
                  {UCF_CAMPUS_WATER.map((path) => (
                    <path d={path} key={path} />
                  ))}
                </g>
                <g className={styles.campusRoads} aria-hidden="true">
                  {UCF_CAMPUS_ROADS.map((path) => (
                    <path d={path} key={path} />
                  ))}
                </g>
                <g className={styles.campusWalkways} aria-hidden="true">
                  {UCF_CAMPUS_WALKWAYS.map((path) => (
                    <path d={path} key={path} />
                  ))}
                </g>
                {CAMPUS_BUILDINGS.map((building) => {
                  const isDestination = LABELED_BUILDING_IDS.has(building.id);
                  const isEventParking = building.id === EVENT_PARKING.id;
                  const liveCount = plottedEvents.filter(
                    (event) =>
                      event.state === "live" &&
                      event.venueLocation.buildingId === building.id,
                  ).length;

                  return (
                    <g
                      key={building.id}
                      aria-hidden={isDestination ? undefined : "true"}
                      aria-label={
                        isEventParking
                          ? "Garage C — Park here"
                          : isDestination
                            ? building.label
                            : undefined
                      }
                      className={styles.building}
                      data-building-id={building.id}
                      data-kind={building.kind}
                      data-event-parking={isEventParking ? "true" : undefined}
                      data-live={liveCount > 0 ? "true" : undefined}
                      data-landmark-glow={
                        building.id === "student-union" ||
                        building.id === "ucf-91"
                          ? "true"
                          : undefined
                      }
                      data-map-interactive={isDestination ? "true" : undefined}
                      data-selected={
                        selectedBuildingId === building.id ? "true" : undefined
                      }
                      onClick={
                        isDestination
                          ? (event) => {
                              event.stopPropagation();
                              focusBuilding(building.id);
                            }
                          : undefined
                      }
                      onKeyDown={
                        isDestination
                          ? (event) =>
                              handleMarkerKeyDown(event, () =>
                                focusBuilding(building.id),
                              )
                          : undefined
                      }
                      role={isDestination ? "button" : undefined}
                      tabIndex={isDestination ? 0 : undefined}
                    >
                      <path d={building.path} />
                      {isEventParking ? (
                        <g
                          className={styles.parkingCallout}
                          transform={`translate(${EVENT_PARKING.center.x} ${EVENT_PARKING.center.y})`}
                          aria-hidden="true"
                        >
                          <text className={styles.parkingName} y="-10">
                            Garage C
                          </text>
                          <text className={styles.parkingAction} y="9">
                            PARK HERE!!!
                          </text>
                          <path d="M0 20v14m-6-6 6 6 6-6" />
                        </g>
                      ) : isDestination ? (
                        <>
                          <text
                            x={building.center.x}
                            y={building.center.y - 2}
                            className={styles.buildingCode}
                          >
                            {building.id === "student-union"
                              ? "SU"
                              : building.abbreviation}
                          </text>
                          <text
                            x={building.center.x}
                            y={building.center.y + 14}
                            className={styles.buildingName}
                            visibility={view.zoom < 2 ? "hidden" : undefined}
                          >
                            {building.label}
                          </text>
                          {liveCount > 0 && (
                            <text
                              className={styles.liveBuildingLabel}
                              x={building.center.x}
                              y={building.center.y - 23}
                            >
                              ● {liveCount} LIVE
                            </text>
                          )}
                        </>
                      ) : null}
                    </g>
                  );
                })}

                {gpsPoint ? (
                  <g
                    className={styles.userMarker}
                    transform={`translate(${gpsPoint.x} ${gpsPoint.y})`}
                  >
                    <circle r="19" className={styles.userAccuracy} />
                    <circle r="8" />
                    <circle r="2.5" className={styles.userCore} />
                    <text x="14" y="4">
                      Approx. you
                    </text>
                  </g>
                ) : null}

                {indoorSpot ? <IndoorMapMarker spot={indoorSpot} /> : null}
              </>
            )}
          </svg>

          {!locationMessage && !selectedEvent ? (
            <p className={styles.mapHint} aria-live="polite">
              {activeFloor
                ? "Drag to explore · Pinch to zoom · Back for campus"
                : "Drag · scroll or pinch to zoom into a KHIX building"}
            </p>
          ) : null}

          {activeFloor ? (
            <details
              ref={legendRef}
              className={styles.roomLegend}
              open={showLegend}
              onToggle={(event) => {
                const open = event.currentTarget.open;
                setShowLegend(open);
                if (open) {
                  setShowLocationPicker(false);
                  setSelectedEventId(null);
                  setEventsExpanded(false);
                  setLocationMessage(null);
                }
              }}
            >
              <summary className={styles.legendToggle}>Map key</summary>
              <div className={styles.legendItems}>
                <span data-state="bathroom">Bathroom</span>
                <span data-state="restricted">Unavailable</span>
                <span data-state="idle">Event room</span>
                <span data-state="live">Live</span>
                <span data-state="upcoming">Within 1 hour</span>
              </div>
            </details>
          ) : null}
          {mapConfigurationQuery.isError ? (
            <p role="alert" className={styles.policyError}>
              Room access could not refresh. Showing the last saved
              configuration.{" "}
              <button
                type="button"
                onClick={() => void mapConfigurationQuery.refetch()}
              >
                Retry
              </button>
            </p>
          ) : null}

          <p className={styles.mapAttribution}>
            Map data © UCF · OpenStreetMap contributors
          </p>

          {showLocationPicker ? (
            <form
              ref={locationPickerRef}
              id="map-location-picker"
              className={styles.locationPicker}
              aria-label="Set your location"
              onSubmit={(event) => {
                event.preventDefault();
                saveIndoorSpot();
                setShowLocationPicker(false);
                locationButtonRef.current?.focus();
              }}
            >
              <div className={styles.locationHeader}>
                <h2>Your location</h2>
                <button
                  className={styles.locationClose}
                  aria-label="Close location settings"
                  type="button"
                  onClick={() => {
                    setShowLocationPicker(false);
                    locationButtonRef.current?.focus();
                  }}
                >
                  <X aria-hidden="true" />
                </button>
              </div>
              <Button
                className={styles.locationButton}
                disabled={locating}
                onClick={locateUser}
                type="button"
                variant="outline"
              >
                <LocateFixed aria-hidden="true" />
                {locating ? "Locating…" : "Use device location"}
              </Button>
              <div className={styles.locationFields}>
                <label>
                  Building
                  <select
                    onChange={(event) => {
                      if (isIndoorBuildingId(event.target.value))
                        setIndoorBuildingId(event.target.value);
                    }}
                    value={indoorBuildingId}
                  >
                    {INDOOR_BUILDINGS.map((building) => (
                      <option key={building.id} value={building.id}>
                        {building.abbreviation}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Room (optional)
                  <input
                    maxLength={60}
                    list="map-room-options"
                    onChange={(event) => setIndoorRoom(event.target.value)}
                    placeholder="224 or Atrium"
                    value={indoorRoom}
                    autoComplete="off"
                  />
                  <datalist id="map-room-options">
                    {KHIX_EVENT_ROOMS.filter(
                      (room) => room.buildingId === indoorBuildingId,
                    ).map((room) => (
                      <option key={room.roomNumber} value={room.roomNumber}>
                        {room.name}
                      </option>
                    ))}
                  </datalist>
                </label>
              </div>
              <Button className={styles.setSpotButton} type="submit">
                <Navigation aria-hidden="true" />
                Set my spot
              </Button>
              {locationMessage ? <p role="status">{locationMessage}</p> : null}
            </form>
          ) : null}

          <MapEventsDock
            events={filteredEvents}
            filter={filter}
            onFilterChange={(value) => {
              setFilter(value);
              setSelectedEventId(null);
            }}
            expanded={eventsExpanded}
            onExpandedChange={(expanded) => {
              setEventsExpanded(expanded);
              setShowLocationPicker(false);
              setShowLegend(false);
              setLocationMessage(null);
            }}
            selectedEvent={selectedEvent}
            onCloseEvent={() => setSelectedEventId(null)}
            onSelectEvent={focusEvent}
            scheduleState={
              scheduleQuery.isPending
                ? "pending"
                : scheduleQuery.isError
                  ? "error"
                  : "ready"
            }
            canViewSchedule={
              dashboard.participant?.status === "confirmed" ||
              dashboard.participant?.status === "checkedin"
            }
            onRetry={() => void scheduleQuery.refetch()}
            timeZone={dashboard.hackathon.timezone}
          />

          {locationMessage && !showLocationPicker ? (
            <p className={styles.locationMessage} aria-live="polite">
              {locationMessage}
            </p>
          ) : null}
        </div>
      </section>
    </>
  );
}

function IndoorMapMarker({ spot }: { spot: IndoorSpot }) {
  const building = CAMPUS_BUILDINGS.find(
    (candidate) => candidate.id === spot.buildingId,
  );
  if (!building) return null;

  return (
    <g
      className={styles.indoorMarker}
      transform={`translate(${building.center.x} ${building.center.y})`}
    >
      <circle r="15" />
      <Navigation x="-7" y="-7" width="14" height="14" />
      <text x="20" y="4">
        You · {building.abbreviation}
        {spot.room ? ` ${spot.room}` : ""}
      </text>
    </g>
  );
}

function IndoorFloorMap({
  activeFloor,
  configuration,
  now,
  events,
  onSelectEvent,
  selectedEventId,
  spot,
}: {
  activeFloor: ActiveFloor;
  configuration: MapConfiguration;
  now: Date;
  events: PlottedScheduleEvent[];
  onSelectEvent: (event: PlottedScheduleEvent) => void;
  selectedEventId: string | null;
  spot: IndoorSpot | null;
}) {
  const floorModel = useMemo(() => {
    const floorPlan = getVenueFloorPlan(
      activeFloor.buildingId,
      activeFloor.floor,
    );
    if (!floorPlan) return null;

    const floorEvents = events.filter(
      (event) =>
        event.venueLocation.buildingId === activeFloor.buildingId &&
        event.venueLocation.room &&
        findVenueRoom(activeFloor.buildingId, event.venueLocation.room)
          ?.floor === activeFloor.floor,
    );
    const floorRotation = FLOOR_ROTATION[activeFloor.buildingId];

    const rooms = floorPlan.rooms.map((room) => ({
      room,
      presentation: getRoomPresentation(
        room,
        activeFloor.buildingId,
        configuration,
        floorEvents,
        now,
      ),
    }));
    const labelAngle = (floorRotation * Math.PI) / 180;
    const labelPositions = rooms
      .filter(
        ({ presentation }) =>
          presentation.label && presentation.state !== "bathroom",
      )
      .map(({ room }) => ({
        id: room.id,
        x: room.x * Math.cos(labelAngle) - room.y * Math.sin(labelAngle),
        y: room.x * Math.sin(labelAngle) + room.y * Math.cos(labelAngle),
      }));
    // Condense tightly packed numbers horizontally while keeping their readable
    // height. Compare upright label positions after the building rotation.
    const labelWidths = new Map(
      labelPositions.map((label) => [
        label.id,
        Math.max(
          12,
          Math.min(
            ...labelPositions
              .filter(
                (other) =>
                  other.id !== label.id && Math.abs(other.y - label.y) < 14,
              )
              .map((other) => Math.abs(other.x - label.x) * 0.88),
          ),
        ),
      ]),
    );

    return { floorPlan, floorEvents, floorRotation, rooms, labelWidths };
  }, [activeFloor.buildingId, activeFloor.floor, configuration, events, now]);
  if (!floorModel) return null;
  const { floorPlan, floorEvents, floorRotation, rooms, labelWidths } =
    floorModel;
  const spotMatch =
    spot?.buildingId === activeFloor.buildingId
      ? findVenueRoom(spot.buildingId, spot.room)
      : null;
  const spotRoom =
    spotMatch?.floor === activeFloor.floor ? spotMatch.room : null;
  return (
    <g
      className={styles.indoorFloor}
      data-floor-geometry="true"
      data-native-walls={floorPlan.structureImage ? "true" : undefined}
      transform={`rotate(${floorRotation} 500 350)`}
    >
      {floorPlan.outlinePath ? (
        <path
          className={styles.floorOutline}
          d={floorPlan.outlinePath}
          vectorEffect="non-scaling-stroke"
          aria-hidden="true"
        />
      ) : null}
      {floorPlan.structureImage ? (
        <image {...floorPlan.structureImage} aria-hidden="true" />
      ) : null}
      {floorPlan.structurePaths ? (
        <g className={styles.floorStructure} aria-hidden="true">
          {floorPlan.structurePaths.map((path, index) => (
            <path d={path} key={`${index}-${path}`} />
          ))}
        </g>
      ) : null}
      {floorPlan.walkableAreas ? (
        <g className={styles.floorWalkableAreas} aria-hidden="true">
          {floorPlan.walkableAreas.map((area) => (
            <g
              key={area.id}
              data-map-highlight={
                area.id.endsWith("walkway") ||
                area.id.endsWith("entrance") ||
                area.id === "north-stairs-landing"
                  ? "true"
                  : undefined
              }
            >
              <path
                d={area.path}
                fillRule="evenodd"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={area.x}
                y={area.y}
                transform={`rotate(${-floorRotation} ${area.x} ${area.y})`}
              >
                {area.label}
              </text>
            </g>
          ))}
        </g>
      ) : null}
      {rooms.map(({ room, presentation }) => {
        const roomEvent = [...floorEvents]
          .filter((event) => event.state !== "ended")
          .sort(
            (a, b) =>
              Number(b.state === "live") - Number(a.state === "live") ||
              Number(b.id === selectedEventId) -
                Number(a.id === selectedEventId),
          )
          .find(
            (event) =>
              event.venueLocation.room &&
              isKhixEventRoom(
                activeFloor.buildingId,
                event.venueLocation.room,
              ) &&
              roomMatchesNumber(
                activeFloor.buildingId,
                room.roomIds,
                event.venueLocation.room,
              ),
          );
        const interactive =
          Boolean(roomEvent) &&
          presentation.state !== "restricted" &&
          presentation.state !== "bathroom";

        return (
          <g
            key={room.id}
            aria-hidden={interactive ? undefined : "true"}
            aria-label={
              roomEvent
                ? `${roomEvent.name}, room ${eventRoomLabel(roomEvent)}. ${presentation.state === "upcoming" ? "Activity within 1 hour." : presentation.state} Tap for event details`
                : undefined
            }
            className={styles.floorRoom}
            data-room-id={room.id}
            data-geometry={room.geometry}
            data-state={presentation.state}
            data-event={interactive ? "true" : undefined}
            data-live={presentation.state === "live" ? "true" : undefined}
            data-map-interactive={interactive ? "true" : undefined}
            data-selected={
              interactive && roomEvent?.id === selectedEventId
                ? "true"
                : undefined
            }
            filter={
              presentation.state === "live" ? "url(#khix-map-glow)" : undefined
            }
            onClick={
              interactive && roomEvent
                ? (event) => {
                    event.stopPropagation();
                    onSelectEvent(roomEvent);
                  }
                : undefined
            }
            onKeyDown={
              interactive && roomEvent
                ? (event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    onSelectEvent(roomEvent);
                  }
                : undefined
            }
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
          >
            <path d={room.path} vectorEffect="non-scaling-stroke" />
            <title>
              {presentation.state === "restricted"
                ? `${presentation.label ? `Room ${presentation.label} · ` : ""}Not available for Knight Hacks`
                : `${presentation.label ?? "Room"}${presentation.name ? ` · ${presentation.name}` : ""} · ${presentation.state === "upcoming" ? "Activity within 1 hour" : presentation.state}`}
            </title>
          </g>
        );
      })}
      {floorPlan.labels ? (
        <g className={styles.floorLabels} aria-hidden="true">
          {floorPlan.labels
            .filter(
              (label) =>
                isWayfindingLabel(label.text) ||
                /^\d{3}[A-Z]?$/.test(label.text),
            )
            .map((label) => (
              <text
                key={`${label.text}-${label.x}-${label.y}`}
                x={label.x}
                y={label.y}
                transform={`rotate(${-floorRotation} ${label.x} ${label.y})`}
                data-check-in={
                  label.text.includes("CHECK-IN") ? "true" : undefined
                }
              >
                {label.text.includes("CHECK-IN") ? (
                  <>
                    <tspan x={label.x} dy="-4">
                      CHECK-IN
                    </tspan>
                    <tspan x={label.x} dy="13">
                      Engineering Atrium
                    </tspan>
                  </>
                ) : (
                  label.text
                )}
              </text>
            ))}
        </g>
      ) : null}
      <g className={styles.floorRoomLabels} aria-hidden="true">
        {rooms.map(({ room, presentation }) =>
          presentation.label && presentation.state !== "bathroom" ? (
            <text
              key={room.id}
              x={room.x}
              y={room.y}
              data-state={presentation.state}
              data-room-number={
                room.roomIds.some((id) => /^\d/.test(id)) ? "true" : undefined
              }
              transform={`rotate(${-floorRotation} ${room.x} ${room.y})`}
              textLength={
                !presentation.name &&
                presentation.label.length * 7 >
                  (labelWidths.get(room.id) ?? Infinity)
                  ? labelWidths.get(room.id)
                  : undefined
              }
              lengthAdjust="spacingAndGlyphs"
            >
              {presentation.label.slice(0, 18)}
              {presentation.name ? (
                <tspan x={room.x} dy="14">
                  {presentation.name.length > 20
                    ? `${presentation.name.slice(0, 19)}…`
                    : presentation.name}
                </tspan>
              ) : null}
            </text>
          ) : null,
        )}
      </g>
      {spotRoom ? (
        <g
          className={styles.floorUserMarker}
          transform={`translate(${spotRoom.x} ${spotRoom.y}) rotate(${-floorRotation})`}
        >
          <circle r="13" />
          <Navigation x="-6" y="-6" width="12" height="12" />
          <text x="18" y="4">
            You
          </text>
        </g>
      ) : null}
    </g>
  );
}

function eventRoomLabel(event: PlottedScheduleEvent) {
  const building = CAMPUS_BUILDINGS.find(
    (entry) => entry.id === event.venueLocation.buildingId,
  );
  return `${building?.abbreviation ?? event.venueLocation.buildingId} ${event.venueLocation.room ?? ""}`.trim();
}

function MapMessageState({
  action,
  actionLabel = "Try again",
  copy,
  title,
}: {
  action?: () => void;
  actionLabel?: string;
  copy: string;
  title: string;
}) {
  return (
    <section className={styles.messageState}>
      <MapPinned aria-hidden="true" />
      <p className={styles.eyebrow}>Knight Hacks IX venue</p>
      <h1>{title}</h1>
      <p>{copy}</p>
      {action ? (
        <Button className={styles.setSpotButton} onClick={action} type="button">
          {actionLabel}
        </Button>
      ) : null}
    </section>
  );
}

function MapLoadingState() {
  return (
    <section className={styles.loadingState} aria-label="Loading venue map">
      <div className={styles.loadingHeader} />
      <div className={styles.loadingMap} />
    </section>
  );
}
