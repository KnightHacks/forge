"use client";

import type { KeyboardEvent, PointerEvent } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Clock3,
  LifeBuoy,
  LocateFixed,
  MapPinned,
  Minus,
  Navigation,
  Plus,
  RotateCcw,
  Utensils,
} from "lucide-react";

import { Button } from "@forge/ui/button";

import type { KhixSessionUser } from "./khix-dashboard";
import type { IndoorBuildingId } from "~/lib/venue-floor-plans";
import type {
  CampusBuildingId,
  MapEventCategory,
  MapPoint,
  PlottedScheduleEvent,
} from "~/lib/venue-map";
import { formatScheduleTimeRange } from "~/lib/event-schedule";
import { useHackerDashboardFlow } from "~/lib/hacker-portal";
import {
  UCF_CAMPUS_ROADS,
  UCF_CAMPUS_WALKWAYS,
  UCF_CAMPUS_WATER,
} from "~/lib/venue-campus-lines.generated";
import {
  getVenueFloorPlan,
  getVenueFloors,
  INDOOR_BUILDING_IDS,
} from "~/lib/venue-floor-plans";
import {
  CAMPUS_BUILDINGS,
  plotScheduleEvents,
  projectCampusCoordinates,
} from "~/lib/venue-map";
import { KhixDashboardShell } from "./khix-dashboard";
import styles from "./khix-venue-map.module.css";

const CAMPUS_MAP_HEIGHT = 700;
const ENG2_MAP_HEIGHT = 980;
const FULL_VIEW = { centerX: 500, centerY: CAMPUS_MAP_HEIGHT / 2, zoom: 1 };
const MIN_ZOOM = 1;
const MAX_ZOOM = 3.8;
const FLOOR_ENTRY_ZOOM = 3.15;
const SCHEDULE_REFRESH_MS = 30_000;
const FLOOR_ROTATION: Record<IndoorBuildingId, number> = {
  ba1: 2,
  ba2: -26,
  eng1: 70,
  "student-union": 0,
  "ucf-91": 0,
};

function eventHasMappedRoom(event: PlottedScheduleEvent) {
  if (!event.venueLocation.room || !event.venueLocation.floor) return false;
  return Boolean(
    getVenueFloorPlan(
      event.venueLocation.buildingId,
      event.venueLocation.floor,
    )?.rooms.some((room) =>
      room.roomIds.includes(event.venueLocation.room ?? ""),
    ),
  );
}
const LABELED_BUILDING_IDS = new Set<CampusBuildingId>([
  "ba1",
  "ba2",
  "eng1",
  "hec",
  "student-union",
  "ucf-91",
]);

type MapFilter = "all" | "food" | "help" | "live";
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

function categoryLabel(category: MapEventCategory) {
  if (category === "food") return "Food";
  if (category === "help") return "Help";
  return "Event";
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
  if (filter === "all") return true;
  if (filter === "live") return event.state === "live";
  return event.category === filter;
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

export function KhixVenueMap({
  sessionUser,
}: {
  sessionUser?: KhixSessionUser;
}) {
  const { dashboard, dashboardQuery, schedule, scheduleQuery } =
    useHackerDashboardFlow({ schedule: true });
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const clock = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(clock);
  }, []);
  const [filter, setFilter] = useState<MapFilter>("all");
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
      const fitted = {
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
        zoom: Math.min(
          (canvasHeight * viewportAspect) / ((maxX - minX) * 1.18),
          canvasHeight / ((maxY - minY) * 1.4),
        ),
      };
      setFittedFloorView(fitted);
      if (!selectedEventId) setView(fitted);
    };
    const observer = new ResizeObserver(measureFloor);
    observer.observe(floor);
    return () => observer.disconnect();
  }, [activeFloor, viewportAspect, canvasHeight, selectedEventId]);

  useEffect(() => {
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
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [view, viewportAspect, canvasHeight]);

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
  }, [canvasHeight, dashboardQuery.isSuccess, activeFloor]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleNativeWheel = (event: globalThis.WheelEvent) => {
      wheelHandler.current(event);
    };
    map.addEventListener("wheel", handleNativeWheel, { passive: false });

    return () => map.removeEventListener("wheel", handleNativeWheel);
  }, [dashboardQuery.isSuccess]);

  useEffect(() => {
    const hydrateLocation = window.setTimeout(() => {
      const stored = window.localStorage.getItem("khix-indoor-location");
      if (!stored) return;

      try {
        const candidate = JSON.parse(stored) as Partial<IndoorSpot>;
        if (
          (candidate.buildingId === "eng1" ||
            candidate.buildingId === "ba1" ||
            candidate.buildingId === "ba2" ||
            candidate.buildingId === "ucf-91" ||
            candidate.buildingId === "student-union") &&
          typeof candidate.room === "string"
        ) {
          setIndoorSpot({
            buildingId: candidate.buildingId,
            room: candidate.room,
          });
          setIndoorBuildingId(candidate.buildingId);
          setIndoorRoom(candidate.room);
        }
      } catch {
        window.localStorage.removeItem("khix-indoor-location");
      }
    }, 0);

    return () => window.clearTimeout(hydrateLocation);
  }, []);

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
  const filteredEvents = plottedEvents.filter(
    (event) => event.state !== "ended" && eventMatchesFilter(event, filter),
  );
  const selectedEvent =
    plottedEvents.find((event) => event.id === selectedEventId) ?? null;
  const leaveFloor = () => {
    setActiveFloor(null);
    setSelectedEventId(null);
    setSelectedBuildingId(null);
    setView(campusReturnView.current);
  };

  const updateZoom = (
    zoom: number,
    targetBuildingId?: IndoorBuildingId | null,
    anchor?: { clientX: number; clientY: number },
  ) => {
    if (floorTransitionUntil.current || pinchChangedFloor.current) return;
    if (activeFloor && zoom < fullView.zoom * 0.96) {
      floorTransitionUntil.current = true;
      window.setTimeout(() => {
        floorTransitionUntil.current = false;
      }, 400);
      pinchChangedFloor.current = gesture.current?.mode === "pinch";
      leaveFloor();
      return;
    }

    const selectedVenueId = isIndoorBuildingId(selectedBuildingId)
      ? selectedBuildingId
      : null;
    const venueId = targetBuildingId ?? selectedVenueId;
    if (!activeFloor && venueId && zoom >= FLOOR_ENTRY_ZOOM) {
      campusReturnView.current = {
        ...view,
        zoom: Math.max(1, view.zoom / 1.8),
      };
      setFittedFloorView(null);
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
        return constrainView(
          { ...current, zoom: nextZoom },
          viewportAspect,
          canvasHeight,
        );
      }

      const bounds = mapRef.current.getBoundingClientRect();
      const xRatio = (anchor.clientX - bounds.left) / bounds.width;
      const yRatio = (anchor.clientY - bounds.top) / bounds.height;
      const currentDimensions = viewDimensions(
        current,
        viewportAspect,
        canvasHeight,
      );
      const nextDimensions = viewDimensions(
        { ...current, zoom: nextZoom },
        viewportAspect,
        canvasHeight,
      );
      const anchorX =
        current.centerX -
        currentDimensions.width / 2 +
        xRatio * currentDimensions.width;
      const anchorY =
        current.centerY -
        currentDimensions.height / 2 +
        yRatio * currentDimensions.height;

      return constrainView(
        {
          centerX: anchorX - (xRatio - 0.5) * nextDimensions.width,
          centerY: anchorY - (yRatio - 0.5) * nextDimensions.height,
          zoom: nextZoom,
        },
        viewportAspect,
        canvasHeight,
      );
    });
  };

  const focusBuilding = (buildingId: CampusBuildingId) => {
    const building = CAMPUS_BUILDINGS.find(
      (candidate) => candidate.id === buildingId,
    );
    if (!building) return;

    setSelectedBuildingId(buildingId);
    setSelectedEventId(null);
    if (isIndoorBuildingId(building.id)) {
      setView(
        constrainView(
          {
            centerX: building.center.x,
            centerY: building.center.y,
            zoom: FLOOR_ENTRY_ZOOM - 0.7,
          },
          viewportAspect,
        ),
      );
      return;
    }
    setView(
      constrainView(
        {
          centerX: building.center.x,
          centerY: building.center.y,
          zoom: 2.2,
        },
        viewportAspect,
      ),
    );
  };

  const focusEvent = (event: PlottedScheduleEvent) => {
    if (!activeFloor) campusReturnView.current = view;
    if (!eventHasMappedRoom(event)) {
      setActiveFloor(null);
      focusBuilding(event.venueLocation.buildingId);
      setSelectedEventId(event.id);
      return;
    }
    const floor = event.venueLocation.floor ?? 1;
    const room = getVenueFloorPlan(
      event.venueLocation.buildingId,
      floor,
    )?.rooms.find(
      (candidate) =>
        event.venueLocation.room &&
        candidate.roomIds.includes(event.venueLocation.room),
    );
    const angle =
      (FLOOR_ROTATION[event.venueLocation.buildingId] * Math.PI) / 180;
    const roomX = room
      ? 500 +
        (room.x - 500) * Math.cos(angle) -
        (room.y - 350) * Math.sin(angle)
      : 500;
    const roomY = room
      ? 350 +
        (room.x - 500) * Math.sin(angle) +
        (room.y - 350) * Math.cos(angle)
      : canvasHeightForBuilding(event.venueLocation.buildingId, floor) / 2;
    setSelectedEventId(event.id);
    setSelectedBuildingId(event.venueLocation.buildingId);
    setActiveFloor({
      buildingId: event.venueLocation.buildingId,
      floor,
    });
    setView(
      constrainView(
        {
          centerX: roomX,
          centerY: roomY,
          zoom: room ? 2.35 : 1,
        },
        viewportAspect,
        canvasHeightForBuilding(event.venueLocation.buildingId, floor),
      ),
    );
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
        originCenterX: view.centerX,
        originCenterY: view.centerY,
        originZoom: view.zoom,
        startX: event.clientX,
        startY: event.clientY,
      };
    } else if (pointers.length === 2) {
      const [first, second] = pointers;
      if (!first || !second) return;
      gesture.current = {
        distance: distance(first, second),
        mode: "pinch",
        originCenterX: view.centerX,
        originCenterY: view.centerY,
        originZoom: view.zoom,
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
    const dimensions = viewDimensions(
      { ...view, zoom: activeGesture.originZoom },
      viewportAspect,
      canvasHeight,
    );
    const scaleX = dimensions.width / rect.width;
    const scaleY = dimensions.height / rect.height;
    setView(
      constrainView(
        {
          centerX:
            activeGesture.originCenterX -
            (event.clientX - activeGesture.startX) * scaleX,
          centerY:
            activeGesture.originCenterY -
            (event.clientY - activeGesture.startY) * scaleY,
          zoom: activeGesture.originZoom,
        },
        viewportAspect,
        canvasHeight,
      ),
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
      room: indoorRoom.trim().slice(0, 24),
    } satisfies IndoorSpot;
    setIndoorSpot(spot);
    window.localStorage.setItem("khix-indoor-location", JSON.stringify(spot));
    focusBuilding(spot.buildingId);
    setLocationMessage(
      `Indoor spot set to ${buildingLabel(spot.buildingId)}${spot.room ? ` · ${spot.room}` : ""}.`,
    );
  };

  if (dashboardQuery.isPending) {
    return (
      <KhixDashboardShell activeItem="map" sessionUser={sessionUser}>
        <h1 className={styles.srOnly}>Knight Hacks IX venue map</h1>
        <MapLoadingState />
      </KhixDashboardShell>
    );
  }

  if (dashboardQuery.isError || !dashboard) {
    return (
      <KhixDashboardShell activeItem="map" sessionUser={sessionUser}>
        <h1 className={styles.srOnly}>Knight Hacks IX venue map</h1>
        <MapMessageState
          action={() => void dashboardQuery.refetch()}
          copy="Refresh the dashboard connection and try once more."
          title="The venue map could not load."
        />
      </KhixDashboardShell>
    );
  }

  return (
    <KhixDashboardShell activeItem="map" sessionUser={sessionUser}>
      <h1 className={styles.srOnly}>Knight Hacks IX venue map</h1>
      <section className={styles.experience} aria-label="Knight Hacks IX map">
        <div className={styles.mapFrame}>
          <div className={styles.toolbar} aria-label="Map filters">
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
                <span className={styles.floorTitle}>
                  {buildingLabel(activeFloor.buildingId)}
                </span>
                <div className={styles.floorTabs} aria-label="Building floor">
                  {getVenueFloors(activeFloor.buildingId).map((floor) => (
                    <button
                      key={floor}
                      aria-label={`Floor ${floor}`}
                      data-active={
                        activeFloor.floor === floor ? "true" : undefined
                      }
                      onClick={() => {
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
              <div className={styles.filterGroup}>
                {(
                  [
                    ["all", "All", MapPinned],
                    ["live", "Live", Clock3],
                    ["food", "Food", Utensils],
                    ["help", "Help", LifeBuoy],
                  ] as const
                ).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    className={styles.filterButton}
                    data-active={filter === value ? "true" : undefined}
                    onClick={() => {
                      setFilter(value);
                      if (value !== "all") setEventsExpanded(true);
                    }}
                    type="button"
                  >
                    <Icon aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={styles.mapControls} aria-label="Map controls">
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
              onClick={() => setView(fullView)}
              type="button"
            >
              <RotateCcw aria-hidden="true" />
            </button>
            <button
              aria-label="Set my location"
              data-active={showLocationPicker ? "true" : undefined}
              onClick={() => setShowLocationPicker((current) => !current)}
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
            role="img"
            onClickCapture={(event) => {
              if (dragged.current) {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
          >
            <defs>
              <linearGradient id="khix-map-ground" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#071b14" />
                <stop offset="0.52" stopColor="#0b2119" />
                <stop offset="1" stopColor="#160f24" />
              </linearGradient>
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
            <rect
              width="1000"
              height={canvasHeight}
              fill="url(#khix-map-ground)"
            />
            {activeFloor ? (
              <IndoorFloorMap
                activeFloor={activeFloor}
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
                  const liveCount = plottedEvents.filter(
                    (event) =>
                      event.state === "live" &&
                      event.venueLocation.buildingId === building.id,
                  ).length;

                  return (
                    <g
                      key={building.id}
                      aria-hidden={isDestination ? undefined : "true"}
                      aria-label={isDestination ? building.label : undefined}
                      className={styles.building}
                      data-building-id={building.id}
                      data-kind={building.kind}
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
                      {isDestination ? (
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

                {filteredEvents.map((event) => (
                  <g
                    key={event.id}
                    aria-label={`${event.state === "live" ? "Live now: " : ""}${event.name}, ${event.location}`}
                    className={styles.eventMarker}
                    data-map-interactive="true"
                    data-category={event.category}
                    data-selected={
                      selectedEventId === event.id ? "true" : undefined
                    }
                    data-state={event.state}
                    filter={
                      event.state === "live" ? "url(#khix-map-glow)" : undefined
                    }
                    onClick={(pointerEvent) => {
                      pointerEvent.stopPropagation();
                      focusEvent(event);
                    }}
                    onKeyDown={(keyboardEvent) =>
                      handleMarkerKeyDown(keyboardEvent, () =>
                        focusEvent(event),
                      )
                    }
                    role="button"
                    tabIndex={0}
                    transform={`translate(${event.point.x} ${event.point.y})`}
                  >
                    {event.state === "live" ? (
                      <circle r="18" className={styles.liveRing} />
                    ) : null}
                    <circle r="10" />
                    <circle r="3" className={styles.markerCore} />
                    {view.zoom > 1.45 ? (
                      <text x="16" y="4" className={styles.markerLabel}>
                        {event.venueLocation.room ?? event.name.slice(0, 18)}
                      </text>
                    ) : null}
                  </g>
                ))}

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
                ? "Drag · scroll or pinch to zoom back to campus"
                : "Drag · scroll or pinch to zoom into a KHIX building"}
            </p>
          ) : null}

          <p className={styles.mapAttribution}>
            Map data © UCF · OpenStreetMap contributors
          </p>

          {showLocationPicker ? (
            <div className={styles.locationPicker}>
              <Button
                className={styles.locationButton}
                disabled={locating}
                onClick={locateUser}
                type="button"
                variant="outline"
              >
                <LocateFixed aria-hidden="true" />
                {locating ? "Locating…" : "Locate me"}
              </Button>
              <label aria-label="Building">
                <select
                  onChange={(event) =>
                    setIndoorBuildingId(event.target.value as IndoorBuildingId)
                  }
                  value={indoorBuildingId}
                >
                  {INDOOR_BUILDINGS.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.abbreviation}
                    </option>
                  ))}
                </select>
              </label>
              <label aria-label="Room or area">
                <input
                  maxLength={24}
                  onChange={(event) => setIndoorRoom(event.target.value)}
                  placeholder="e.g. 224 or Atrium"
                  value={indoorRoom}
                />
              </label>
              <Button
                className={styles.setSpotButton}
                onClick={() => {
                  saveIndoorSpot();
                  setShowLocationPicker(false);
                }}
                type="button"
              >
                <Navigation aria-hidden="true" />
                Set my spot
              </Button>
            </div>
          ) : null}

          <section
            className={styles.eventsSheet}
            data-expanded={eventsExpanded}
            aria-label="Venue events"
          >
            <button
              className={styles.sheetToggle}
              type="button"
              aria-expanded={eventsExpanded}
              aria-controls="map-event-list"
              onClick={() => setEventsExpanded(!eventsExpanded)}
            >
              <span className={styles.sheetHandle} />
              <span>
                Happening now{" "}
                <span className={styles.eventCount}>
                  {scheduleQuery.isSuccess
                    ? plottedEvents.filter((event) => event.state === "live")
                        .length
                    : "—"}
                </span>
              </span>
              <span className={styles.sheetAction}>
                {eventsExpanded ? "Collapse" : "Explore events"}
              </span>
            </button>
            {eventsExpanded && (
              <div id="map-event-list" className={styles.eventList}>
                {dashboard.participant?.status !== "confirmed" &&
                dashboard.participant?.status !== "checkedin" ? (
                  <p>Confirm your attendance to view the schedule.</p>
                ) : scheduleQuery.isPending ? (
                  <p>Loading schedule…</p>
                ) : scheduleQuery.isError ? (
                  <button
                    type="button"
                    onClick={() => void scheduleQuery.refetch()}
                  >
                    Schedule unavailable · Retry
                  </button>
                ) : filteredEvents.filter((event) => event.state !== "ended")
                    .length === 0 ? (
                  <p>
                    No {filter === "live" ? "live" : "upcoming"} events right
                    now.
                  </p>
                ) : (
                  filteredEvents
                    .filter((event) => event.state !== "ended")
                    .map((event) => (
                      <button
                        className={styles.eventRow}
                        aria-label={`${event.name}, ${event.location}. ${eventHasMappedRoom(event) ? "Show room" : "Show building; room not mapped"}`}
                        aria-pressed={event.id === selectedEventId}
                        key={event.id}
                        type="button"
                        onClick={() => {
                          focusEvent(event);
                          setEventsExpanded(false);
                        }}
                      >
                        <span className={styles.eventTime}>
                          {event.state === "live"
                            ? "LIVE"
                            : formatScheduleTimeRange(
                                event.startDateTime,
                                event.endDateTime,
                                dashboard.hackathon.timezone,
                              )}
                        </span>
                        <strong>{event.name}</strong>
                        <span>{event.location}</span>
                        <span className={styles.eventAction}>
                          {eventHasMappedRoom(event)
                            ? "Show room →"
                            : "Show building → · Room not mapped"}
                        </span>
                      </button>
                    ))
                )}
              </div>
            )}
          </section>

          {selectedEvent ? (
            <div>
              <button
                className={styles.closeSelection}
                type="button"
                onClick={() => setSelectedEventId(null)}
              >
                Close event
              </button>
              <MapSelection
                event={selectedEvent}
                timeZone={dashboard.hackathon.timezone}
              />
            </div>
          ) : null}

          {locationMessage ? (
            <p className={styles.locationMessage} aria-live="polite">
              {locationMessage}
            </p>
          ) : null}

          {scheduleQuery.isError && !eventsExpanded ? (
            <button
              className={styles.scheduleError}
              onClick={() => void scheduleQuery.refetch()}
              type="button"
            >
              Schedule unavailable · retry
            </button>
          ) : null}
        </div>
      </section>
    </KhixDashboardShell>
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
  events,
  onSelectEvent,
  selectedEventId,
  spot,
}: {
  activeFloor: ActiveFloor;
  events: PlottedScheduleEvent[];
  onSelectEvent: (event: PlottedScheduleEvent) => void;
  selectedEventId: string | null;
  spot: IndoorSpot | null;
}) {
  const floorPlan = getVenueFloorPlan(
    activeFloor.buildingId,
    activeFloor.floor,
  );
  if (!floorPlan) return null;

  const floorEvents = events.filter(
    (event) =>
      event.venueLocation.buildingId === activeFloor.buildingId &&
      event.venueLocation.floor === activeFloor.floor,
  );
  const floorRotation = FLOOR_ROTATION[activeFloor.buildingId];
  const normalizedSpotRoom = spot?.room.trim().toUpperCase() ?? "";
  const spotRoom =
    spot?.buildingId === activeFloor.buildingId
      ? floorPlan.rooms.find((room) =>
          room.roomIds.includes(normalizedSpotRoom),
        )
      : null;

  return (
    <g
      className={styles.indoorFloor}
      data-floor-geometry="true"
      transform={`rotate(${floorRotation} 500 350)`}
    >
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
              <path d={area.path} vectorEffect="non-scaling-stroke" />
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
      {floorPlan.rooms.map((room) => {
        const roomEvent = [...floorEvents]
          .filter((event) => event.state !== "ended")
          .sort(
            (a, b) =>
              Number(b.id === selectedEventId) -
                Number(a.id === selectedEventId) ||
              Number(b.state === "live") - Number(a.state === "live"),
          )
          .find(
            (event) =>
              event.venueLocation.room &&
              room.roomIds.includes(event.venueLocation.room),
          );
        const interactive = Boolean(roomEvent);

        return (
          <g
            key={room.id}
            aria-hidden={interactive ? undefined : "true"}
            aria-label={
              roomEvent
                ? `${roomEvent.name}, room ${eventRoomLabel(roomEvent)}. Tap for event details`
                : undefined
            }
            className={styles.floorRoom}
            data-event={roomEvent ? "true" : undefined}
            data-live={roomEvent?.state === "live" ? "true" : undefined}
            data-map-interactive={interactive ? "true" : undefined}
            data-selected={
              roomEvent?.id === selectedEventId ? "true" : undefined
            }
            filter={
              roomEvent?.state === "live" ? "url(#khix-map-glow)" : undefined
            }
            onClick={
              roomEvent
                ? (event) => {
                    event.stopPropagation();
                    onSelectEvent(roomEvent);
                  }
                : undefined
            }
            onKeyDown={
              roomEvent
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
            {room.label ? (
              <text
                x={room.x}
                y={room.y}
                transform={`rotate(${-floorRotation} ${room.x} ${room.y})`}
              >
                {room.roomIds.find((roomId) => /^\d/.test(roomId)) ??
                  room.roomIds[0]?.slice(0, 18)}
              </text>
            ) : null}
            {(roomEvent?.state === "live" ||
              roomEvent?.id === selectedEventId) && (
              <g
                transform={`translate(${room.x} ${room.y}) rotate(${-floorRotation})`}
                className={styles.liveRoomBadge}
              >
                <rect x="-23" y="-25" width="46" height="16" rx="8" />
                <text x="0" y="-14">
                  {roomEvent.state === "live" ? "● LIVE" : "HERE"}
                </text>
              </g>
            )}
          </g>
        );
      })}
      {floorPlan.labels ? (
        <g className={styles.floorLabels} aria-hidden="true">
          {floorPlan.labels.map((label) => (
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
  return `${event.venueLocation.buildingId.toUpperCase()} ${event.venueLocation.room ?? ""}`.trim();
}

function MapSelection({
  event,
  timeZone,
}: {
  event: PlottedScheduleEvent;
  timeZone: string;
}) {
  return (
    <section className={styles.selection} aria-live="polite">
      <span className={styles.selectionType}>
        {event.state === "live" ? "Live now" : categoryLabel(event.category)}
      </span>
      <h2>{event.name}</h2>
      {!eventHasMappedRoom(event) && (
        <p>Room location is not mapped. Showing the building only.</p>
      )}
      <p>{event.description || "No additional event details."}</p>
      <dl>
        <div>
          <dt>When</dt>
          <dd>
            {formatScheduleTimeRange(
              event.startDateTime,
              event.endDateTime,
              timeZone,
            )}
          </dd>
        </div>
        <div>
          <dt>Where</dt>
          <dd>{event.location || "Location TBA"}</dd>
        </div>
        <div>
          <dt>Floor</dt>
          <dd>{event.venueLocation.floor ?? "Check room signage"}</dd>
        </div>
      </dl>
    </section>
  );
}

function MapMessageState({
  action,
  copy,
  title,
}: {
  action?: () => void;
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
          Try again
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
